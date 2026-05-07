"""
GRID.01 FastAPI backend.
Replay endpoint mirrors f1-race-replay's data pipeline exactly
(per-lap telemetry via multiprocessing) so it always works with
the same FastF1 cache.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from multiprocessing import Pool, cpu_count
from datetime import timedelta
import fastf1
import pandas as pd
import numpy as np
import os
import json
import asyncio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".fastf1-cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

# ── In-memory caches ─────────────────────────────────────────────────────────
_replay_cache:    dict = {}   # keyed "year_round"
_telemetry_cache: dict = {}   # keyed "year_round_driver"

# ── FPS for replay stream ─────────────────────────────────────────────────────
STREAM_FPS = 10          # messages/second sent to frontend
DT_STREAM  = 1 / STREAM_FPS


# ── Helpers (same logic as f1-race-replay/src/f1_data.py) ────────────────────

def _tyre_int(compound: str) -> int:
    return {"SOFT": 1, "MEDIUM": 2, "HARD": 3, "INTERMEDIATE": 4, "WET": 5}.get(
        str(compound).upper(), 2
    )


def _process_driver(args):
    """
    Top-level function so multiprocessing.Pool can pickle it.
    Mirrors f1-race-replay's _process_single_driver exactly.
    """
    driver_no, session, code = args
    try:
        laps = session.laps.pick_drivers(driver_no)
        if laps.empty:
            return None

        t_all, x_all, y_all = [], [], []
        dist_all, rd_all    = [], []
        lap_nums, tyre_all  = [], []
        sp_all, g_all       = [], []
        drs_all, th_all, br_all = [], [], []
        total_dist = 0.0

        for _, lap in laps.iterlaps():
            try:
                tel = lap.get_telemetry()
                if tel is None or tel.empty or "X" not in tel.columns:
                    continue
                n = len(tel)

                t   = tel["SessionTime"].dt.total_seconds().to_numpy(dtype=float)
                x   = tel["X"].to_numpy(dtype=float)
                y   = tel["Y"].to_numpy(dtype=float)
                d   = tel["Distance"].to_numpy(dtype=float) if "Distance" in tel.columns else np.zeros(n)
                rd  = tel["RelativeDistance"].to_numpy(dtype=float) if "RelativeDistance" in tel.columns else np.zeros(n)
                sp  = tel["Speed"].to_numpy(dtype=float)
                g   = tel["nGear"].to_numpy(dtype=float)   if "nGear"    in tel.columns else np.zeros(n)
                drs = tel["DRS"].to_numpy(dtype=float)     if "DRS"      in tel.columns else np.zeros(n)
                th  = tel["Throttle"].to_numpy(dtype=float) * 100 if "Throttle" in tel.columns else np.zeros(n)
                br  = tel["Brake"].to_numpy(dtype=float)   * 100 if "Brake"    in tel.columns else np.zeros(n)

                race_d = total_dist + d
                total_dist = race_d[-1] if len(race_d) else total_dist

                lap_num  = int(lap.LapNumber) if not pd.isna(lap.LapNumber) else 0
                tyre_int = _tyre_int(str(lap.Compound) if not pd.isna(lap.Compound) else "")

                t_all.append(t);  x_all.append(x);    y_all.append(y)
                dist_all.append(race_d); rd_all.append(rd)
                lap_nums.append(np.full(n, lap_num, dtype=float))
                tyre_all.append(np.full(n, tyre_int, dtype=float))
                sp_all.append(sp); g_all.append(g); drs_all.append(drs)
                th_all.append(th); br_all.append(br)
            except Exception:
                continue

        if not t_all:
            return None

        t   = np.concatenate(t_all)
        order = np.argsort(t)
        return {
            "code": code,
            "t_min": float(t.min()),
            "t_max": float(t.max()),
            "data": {
                "t":        t[order],
                "x":        np.concatenate(x_all)[order],
                "y":        np.concatenate(y_all)[order],
                "dist":     np.concatenate(dist_all)[order],
                "rel_dist": np.concatenate(rd_all)[order],
                "lap":      np.concatenate(lap_nums)[order],
                "tyre":     np.concatenate(tyre_all)[order],
                "speed":    np.concatenate(sp_all)[order],
                "gear":     np.concatenate(g_all)[order],
                "drs":      np.concatenate(drs_all)[order],
                "throttle": np.concatenate(th_all)[order],
                "brake":    np.concatenate(br_all)[order],
            },
        }
    except Exception:
        return None


def _build_replay(year: int, round_num: int) -> dict:
    """
    Load session + build full pre-rendered frames array.
    Runs in a thread pool so it won't block the event loop.
    Mirrors get_race_telemetry from f1-race-replay.
    """
    session = fastf1.get_session(year, round_num, "R")
    session.load(telemetry=True, laps=True, weather=True)

    event_name = str(session.event["EventName"])
    drivers    = session.drivers
    codes      = {num: session.get_driver(num)["Abbreviation"] for num in drivers}

    # ── 1. Per-driver telemetry (parallel) ──────────────────────────────────
    args = [(drv, session, codes[drv]) for drv in drivers]
    procs = min(cpu_count(), len(drivers))
    with Pool(processes=procs) as pool:
        results = pool.map(_process_driver, args)

    driver_data: dict = {}
    g_t_min = g_t_max = None
    total_laps = 0

    for r in results:
        if r is None:
            continue
        driver_data[r["code"]] = r["data"]
        g_t_min = r["t_min"] if g_t_min is None else min(g_t_min, r["t_min"])
        g_t_max = r["t_max"] if g_t_max is None else max(g_t_max, r["t_max"])
        total_laps = max(total_laps, int(r["data"]["lap"].max()))

    if not driver_data:
        raise ValueError("No valid telemetry data found")

    # ── 2. Resample to common 10fps timeline ────────────────────────────────
    # Use 5× playback — step 5× race time but stream at 10fps real time
    PLAYBACK  = 5
    DT_RACE   = (1 / STREAM_FPS) * PLAYBACK          # 0.5 s race-time per frame
    timeline  = np.arange(g_t_min, g_t_max, DT_RACE)
    tl_shifted = timeline - g_t_min

    resampled: dict = {}
    for code, d in driver_data.items():
        t_shifted = d["t"] - g_t_min
        order     = np.argsort(t_shifted)
        ts        = t_shifted[order]
        t_lo, t_hi = float(ts[0]), float(ts[-1])

        # Non-positional channels: clamp to boundary (fine for speed, gear etc.)
        other_keys = ["dist","rel_dist","lap","tyre","speed","gear","drs","throttle","brake"]
        resampled[code] = {k: np.interp(tl_shifted, ts, d[k][order]) for k in other_keys}

        # Positional channels: NaN outside driver's actual data range.
        # This makes retired / DNF cars disappear instead of freezing at last position.
        outside = (tl_shifted < t_lo) | (tl_shifted > t_hi)
        x_arr = np.interp(tl_shifted, ts, d["x"][order])
        y_arr = np.interp(tl_shifted, ts, d["y"][order])
        x_arr[outside] = np.nan
        y_arr[outside] = np.nan
        resampled[code]["x"] = x_arr
        resampled[code]["y"] = y_arr
        resampled[code]["t"] = tl_shifted

    # ── 3. Bounds + track ghost + pit lane ──────────────────────────────────
    all_x = np.concatenate([resampled[c]["x"] for c in resampled])
    all_y = np.concatenate([resampled[c]["y"] for c in resampled])
    finite = ~(np.isnan(all_x) | np.isnan(all_y))
    valid  = finite & ((np.abs(all_x) > 1) | (np.abs(all_y) > 1))
    vx, vy = all_x[valid], all_y[valid]

    pad_x = (np.percentile(vx, 99) - np.percentile(vx, 1)) * 0.08
    pad_y = (np.percentile(vy, 99) - np.percentile(vy, 1)) * 0.08
    bounds = {
        "minX": float(np.percentile(vx, 1)) - pad_x,
        "maxX": float(np.percentile(vx, 99)) + pad_x,
        "minY": float(np.percentile(vy, 1)) - pad_y,
        "maxY": float(np.percentile(vy, 99)) + pad_y,
    }

    # ── Track outline: ordered raw telemetry from one clean lap ────────────────
    # Use raw driver_data (20 Hz FastF1 telemetry, ~1800 pts/lap) not the
    # 10-fps resampled data — gives a smooth, detailed circuit outline.
    track_pts: list = []
    for code in list(driver_data.keys()):
        d       = driver_data[code]
        lap_arr = np.round(d["lap"]).astype(int)
        x_arr   = d["x"]
        y_arr   = d["y"]
        max_lap = int(lap_arr.max()) if len(lap_arr) else 1
        for target_lap in range(2, max(max_lap + 1, 5)):
            mask  = (lap_arr == target_lap)
            rx, ry = x_arr[mask], y_arr[mask]
            valid  = ~(np.isnan(rx) | np.isnan(ry))
            rx, ry = rx[valid], ry[valid]
            if len(rx) < 200:
                continue
            # Subsample to ~600 evenly-spaced points — enough detail, not too heavy
            step = max(1, len(rx) // 600)
            track_pts = [[float(rx[i]), float(ry[i])] for i in range(0, len(rx), step)]
            break
        if track_pts:
            break
    if not track_pts:
        # Last-resort fallback: any available positions in time order
        for code in list(driver_data.keys()):
            d = driver_data[code]
            valid = ~(np.isnan(d["x"]) | np.isnan(d["y"]))
            xs, ys = d["x"][valid], d["y"][valid]
            if len(xs) < 100:
                continue
            step = max(1, len(xs) // 600)
            track_pts = [[float(xs[i]), float(ys[i])] for i in range(0, len(xs), step)]
            break

    # ── Pit lane: ordered from one driver's pit-in lap ───────────────────────
    # Single driver, single lap, in time order → renders as a clean path.
    pit_pts: list = []
    for driver_no in drivers:
        try:
            dlaps    = session.laps.pick_drivers(driver_no)
            pit_laps = dlaps[dlaps["PitInTime"].notna()]
            if pit_laps.empty:
                continue
            tel = pit_laps.iloc[0:1].get_telemetry()   # first pit-in lap only
            if tel is None or tel.empty or "X" not in tel.columns:
                continue
            xs  = tel["X"].to_numpy(dtype=float)
            ys  = tel["Y"].to_numpy(dtype=float)
            sps = tel["Speed"].to_numpy(dtype=float)
            # Pit lane = slow section of the lap (< 80 km/h)
            pit_mask = (sps < 80) & ~(np.isnan(xs) | np.isnan(ys))
            xs_p, ys_p = xs[pit_mask], ys[pit_mask]
            if len(xs_p) > 10:
                pit_pts = [[float(xs_p[i]), float(ys_p[i])] for i in range(len(xs_p))]
                break
        except Exception:
            continue

    # ── 4. Pre-build frames ──────────────────────────────────────────────────
    driver_codes = list(resampled.keys())
    frames: list = []
    n_frames = len(tl_shifted)

    for i in range(n_frames):
        t_val = float(tl_shifted[i])
        snapshot = []
        for code in driver_codes:
            d = resampled[code]
            xi_raw, yi_raw = d["x"][i], d["y"][i]
            # Skip NaN (driver outside their data range) or near-origin GPS artefacts
            if np.isnan(xi_raw) or np.isnan(yi_raw):
                continue
            xi, yi = float(xi_raw), float(yi_raw)
            if abs(xi) < 1 and abs(yi) < 1:
                continue
            snapshot.append({
                "code": code,
                "x": xi, "y": yi,
                "dist":     float(d["dist"][i]),
                "rel_dist": float(d["rel_dist"][i]),
                "lap":      int(round(d["lap"][i])),
                "tyre":     int(round(d["tyre"][i])),
                "speed":    float(d["speed"][i]),
                "gear":     int(round(d["gear"][i])),
                "drs":      int(round(d["drs"][i])),
                "throttle": float(d["throttle"][i]),
                "brake":    float(d["brake"][i]),
            })

        if not snapshot:
            continue

        snapshot.sort(key=lambda r: (r["lap"], r["dist"]), reverse=True)
        frame_data: dict = {}
        for pos, car in enumerate(snapshot, 1):
            frame_data[car["code"]] = {
                "x": car["x"], "y": car["y"],
                "speed": car["speed"], "gear": car["gear"],
                "throttle": car["throttle"], "brake": car["brake"],
                "drs": car["drs"], "tyre": car["tyre"],
                "position": pos,
                "lap": car["lap"], "rel_dist": car["rel_dist"], "dist": car["dist"],
            }

        leader = snapshot[0]
        secs = int(g_t_min + t_val * PLAYBACK)
        time_str = f"{secs//3600:02d}:{(secs%3600)//60:02d}:{secs%60:02d}"

        frames.append({
            "frame":        {"drivers": frame_data, "safety_car": None,
                             "lap": leader["lap"], "t": t_val},
            "session_data": {"lap": leader["lap"], "leader": leader["code"],
                             "time": time_str, "total_laps": total_laps},
            "track_status":   "1",
            "is_paused":      False,
            "playback_speed": PLAYBACK,
            "frame_index":    i,
            "total_frames":   n_frames,
            "event_name":     event_name,
        })

    return {
        "frames":     frames,
        "bounds":     bounds,
        "track_pts":  track_pts,
        "pit_pts":    pit_pts,
        "event_name": event_name,
        "total_laps": total_laps,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/schedule/{year}")
async def get_schedule(year: int):
    def _load():
        try:
            sched = fastf1.get_event_schedule(year, include_testing=False)
            return {"races": [
                {"round": int(r["RoundNumber"]), "name": str(r["EventName"]),
                 "date": str(r["EventDate"].date()), "country": str(r.get("Country",""))}
                for _, r in sched.iterrows()
                if str(r.get("EventFormat","")).lower() != "testing"
            ]}
        except Exception as e:
            return {"error": str(e), "races": []}
    return await asyncio.to_thread(_load)


@app.get("/api/telemetry/{year}/{round_num}/{driver}")
async def get_telemetry(year: int, round_num: int, driver: str):
    cache_key = f"{year}_{round_num}_{driver}"
    if cache_key in _telemetry_cache:
        return _telemetry_cache[cache_key]

    def _load():
        try:
            session = fastf1.get_session(year, round_num, "R")
            session.load(telemetry=True, laps=True, weather=False)
            fastest = session.laps.pick_driver(driver).pick_fastest()
            tel = fastest.get_telemetry()
            result = {
                "Speed":    tel["Speed"].tolist(),
                "Throttle": tel["Throttle"].tolist(),
                "Brake":    tel["Brake"].tolist(),
                "nGear":    tel["nGear"].tolist(),
                "DRS":      tel["DRS"].tolist() if "DRS" in tel.columns else [],
            }
            _telemetry_cache[cache_key] = result
            return result
        except Exception as e:
            return {"error": str(e)}
    return await asyncio.to_thread(_load)


@app.get("/api/replay/{year}/{round_num}")
async def stream_replay(year: int, round_num: int, request: Request):
    cache_key = f"{year}_{round_num}"

    async def generate():
        try:
            cached = _replay_cache.get(cache_key)

            if cached is None:
                yield f"data: {json.dumps({'status':'loading','message':f'Loading {year} Round {round_num}...'})}\n\n"

                def _run():
                    return _build_replay(year, round_num)

                try:
                    cached = await asyncio.to_thread(_run)
                    _replay_cache[cache_key] = cached
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    return
            else:
                yield f"data: {json.dumps({'status':'loading','message':'Loaded from cache — starting...'})}\n\n"

            # Send setup (bounds + track ghost + pit lane) — frontend locks immediately
            yield f"data: {json.dumps({'status':'ready','bounds':cached['bounds'],'track_pts':cached['track_pts'],'pit_pts':cached['pit_pts'],'event_name':cached['event_name']})}\n\n"

            # Stream pre-built frames
            for frame in cached["frames"]:
                if await request.is_disconnected():
                    break
                yield f"data: {json.dumps(frame)}\n\n"
                await asyncio.sleep(DT_STREAM)

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache, no-transform",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
