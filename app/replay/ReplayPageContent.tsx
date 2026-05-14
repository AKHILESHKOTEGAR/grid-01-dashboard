"use client";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */
const DRIVER_COLORS: Record<string, string> = {
  NOR: "#FF8000", PIA: "#FF8000",
  RUS: "#48C4B1", ANT: "#48C4B1",
  LEC: "#E8002D", HAM: "#E8002D",
  VER: "#000044", HAD: "#000044",
  ALO: "#229971", STR: "#229971",
  GAS: "#0093CC", DOO: "#0093CC",
  ALB: "#0545D9", SAI: "#0545D9",
  BEA: "#B6BABD", OCO: "#B6BABD",
  LIN: "#3367EA", LAW: "#3367EA",
  HUL: "#C00F0C", BOR: "#C00F0C",
  PER: "#B8960C", BOT: "#B8960C",
};

const TYRE: Record<number, { label: string; color: string }> = {
  1: { label: "S", color: "#E8002D" },
  2: { label: "M", color: "#FFD700" },
  3: { label: "H", color: "#E8E8E8" },
  4: { label: "I", color: "#39B54A" },
  5: { label: "W", color: "#0067FF" },
};

const SVG_W = 800;
const SVG_H = 560;
const PAD   = 52;
const ALL_DRIVER_CODES = Object.keys(DRIVER_COLORS);
const LEADER_INTERVAL  = 250; // ms — leaderboard/stats update rate

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
type DriverFrame = {
  x: number; y: number; speed: number; gear: number;
  throttle: number; brake: number; drs: number; tyre: number;
  position: number; lap: number; rel_dist: number; dist: number;
};

type FrameMsg = {
  frame: {
    drivers: Record<string, DriverFrame>;
    safety_car: { x: number; y: number } | null;
    lap: number; t: number;
  };
  session_data: { lap: number; leader: string; time: string; total_laps: number };
  track_status: string;
  playback_speed: number;
  frame_index: number;
  total_frames: number;
  event_name?: string;
};

type Race = { round: string; raceName: string; date: string };

type LeaderData = {
  sorted: [string, DriverFrame][];
  session: { lap: number; leader: string; time: string; total_laps: number };
  trackStatus: string;
  eventName?: string;
};

/* ------------------------------------------------------------------ */
/*  HOOK: race schedule                                                */
/* ------------------------------------------------------------------ */
function useRaceSchedule(year: string) {
  const [races, setRaces]     = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`)
      .then(r => r.json())
      .then(d => {
        const list: Race[] = d?.MRData?.RaceTable?.Races ?? [];
        const now  = new Date();
        const past = list.filter(r => new Date(r.date) <= now);
        setRaces(past.length ? past : list);
      })
      .catch(() => setRaces([]))
      .finally(() => setLoading(false));
  }, [year]);

  return { races, loading };
}

/* ------------------------------------------------------------------ */
/*  MEMOIZED LEADERBOARD ROW                                           */
/* ------------------------------------------------------------------ */
const LeaderRow = memo(function LeaderRow({ code, d }: { code: string; d: DriverFrame }) {
  const tyre  = TYRE[Math.round(d.tyre)] ?? { label: "?", color: "#555" };
  const color = DRIVER_COLORS[code] ?? "#888";
  const inPit = d.speed < 60 && d.lap > 1;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 border-b hover:bg-white/5 transition-colors"
      style={{ borderColor: "var(--border)" }}>
      <span className="font-mono font-black text-xs w-5 text-center shrink-0"
        style={{ color: d.position <= 3 ? "#E10600" : "var(--text-3)" }}>
        {d.position}
      </span>
      <div className="w-0.5 h-6 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-[11px] uppercase" style={{ color: "var(--text)" }}>{code}</span>
          {inPit && (
            <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(255,200,0,0.15)", color: "#FFD700", border: "1px solid rgba(255,200,0,0.3)" }}>
              PIT
            </span>
          )}
        </div>
        <div className="text-[8px] font-mono mt-0.5" style={{ color: "var(--text-3)" }}>
          L{d.lap} · {Math.round(d.speed)}<span style={{ color: "var(--text-4)" }}>km/h</span>
          {" · "}G{d.gear}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-3 h-3 rounded-full border border-black/30" style={{ background: tyre.color }} />
        {d.drs > 0 && (
          <span className="text-[7px] font-black tracking-wide" style={{ color: "#22c55e" }}>DRS</span>
        )}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function ReplayPageContent() {
  const [year,  setYear]  = useState("2026");
  const [round, setRound] = useState("1");
  const { races, loading: racesLoading } = useRaceSchedule(year);

  const [phase,    setPhase]    = useState<"idle"|"loading"|"live"|"error">("idle");
  const [loadMsg,  setLoadMsg]  = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed,  setElapsed]  = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [trackPts, setTrackPts] = useState<[number,number][]>([]);

  // Throttled state for leaderboard, stats, event banner (4 Hz)
  const [leaderData, setLeaderData] = useState<LeaderData | null>(null);

  // Refs
  const esRef        = useRef<EventSource | null>(null);
  const rafRef       = useRef<number>(0);
  const frameRef     = useRef<FrameMsg | null>(null);
  const boundsRef    = useRef({ minX: 0, maxX: 1, minY: 0, maxY: 1, locked: false });
  const carRefs      = useRef<Map<string, SVGGElement>>(new Map());
  const pitRingRefs  = useRef<Map<string, SVGCircleElement>>(new Map());
  const scRef        = useRef<SVGGElement | null>(null);
  const progressRef  = useRef<HTMLDivElement | null>(null);
  const lastLeaderTs = useRef<number>(0);

  useEffect(() => {
    if (races.length === 0) return;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const available = races.filter(r => new Date(r.date).getTime() < sevenDaysAgo);
    if (available.length > 0) {
      setRound(available[available.length - 1].round);
    }
  }, [races]);

  const toSvg = useCallback((x: number, y: number): [number, number] => {
    const b = boundsRef.current;
    const rx = b.maxX - b.minX;
    const ry = b.maxY - b.minY;
    if (rx === 0 || ry === 0) return [SVG_W / 2, SVG_H / 2];
    const sx = ((x - b.minX) / rx) * (SVG_W - PAD * 2) + PAD;
    const sy = SVG_H - PAD - ((y - b.minY) / ry) * (SVG_H - PAD * 2);
    return [sx, sy];
  }, []);

  // RAF loop — direct DOM for positions/progress, throttled React state for UI
  useEffect(() => {
    const tick = (ts: number) => {
      const f = frameRef.current;

      if (f?.frame?.drivers) {
        const drivers = f.frame.drivers;

        // Direct DOM: car transforms (60 fps, zero React re-renders)
        for (const [code, d] of Object.entries(drivers)) {
          const el = carRefs.current.get(code);
          if (el) {
            const [sx, sy] = toSvg(d.x, d.y);
            el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
            if (el.style.display === "none") el.style.display = "";
            // Pit ring
            const pitRing = pitRingRefs.current.get(code);
            if (pitRing) pitRing.style.display = (d.speed < 60 && d.lap > 1) ? "" : "none";
          }
        }

        // Direct DOM: safety car
        if (scRef.current) {
          if (f.frame.safety_car) {
            const [sx, sy] = toSvg(f.frame.safety_car.x, f.frame.safety_car.y);
            scRef.current.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
            if (scRef.current.style.display === "none") scRef.current.style.display = "";
          } else {
            scRef.current.style.display = "none";
          }
        }

        // Direct DOM: progress bar
        if (progressRef.current) {
          const pct = (f.frame_index / Math.max(1, f.total_frames)) * 100;
          progressRef.current.style.width = `${pct.toFixed(2)}%`;
        }

        // Throttled React state: leaderboard + stats (4 Hz)
        if (ts - lastLeaderTs.current > LEADER_INTERVAL) {
          lastLeaderTs.current = ts;
          const sorted = Object.entries(drivers).sort((a, b) => a[1].position - b[1].position);
          setLeaderData({
            sorted,
            session: f.session_data,
            trackStatus: f.track_status ?? "",
            eventName: f.event_name,
          });
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [toSvg]);

  const resetState = useCallback(() => {
    boundsRef.current  = { minX: 0, maxX: 1, minY: 0, maxY: 1, locked: false };
    frameRef.current   = null;
    lastLeaderTs.current = 0;
    setTrackPts([]);
    setLeaderData(null);
    for (const el of carRefs.current.values()) {
      el.style.display   = "none";
      el.style.transform = "translate(-100px,-100px)";
    }
    if (scRef.current)     scRef.current.style.display = "none";
    if (progressRef.current) progressRef.current.style.width = "0%";
  }, []);

  const startReplay = useCallback(() => {
    esRef.current?.close();
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    resetState();
    setPhase("loading");
    setElapsed(0);
    setLoadMsg("Connecting to backend…");
    setErrorMsg("");
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
    const wsBase = backendBase.replace(/^http/, "ws");
    const url = `${wsBase}/ws/replay/${encodeURIComponent(year)}/${encodeURIComponent(round)}`;
    const ws = new WebSocket(url);
    esRef.current = ws as unknown as EventSource;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.error) {
          if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
          setPhase("error");
          setErrorMsg(
            data.error === "backend_offline"
              ? "Backend offline"
              : data.error.includes("No valid telemetry")
              ? "Race data not available yet — select an earlier round"
              : data.error
          );
          ws.close();
          return;
        }

        if (data.status === "loading") {
          setLoadMsg(data.message ?? "Loading…");
          return;
        }

        if (data.status === "ready") {
          const b = boundsRef.current;
          b.minX = data.bounds.minX; b.maxX = data.bounds.maxX;
          b.minY = data.bounds.minY; b.maxY = data.bounds.maxY;
          b.locked = true;
          if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
          if (Array.isArray(data.track_pts)) setTrackPts(data.track_pts as [number,number][]);
          setPhase("live");
          return;
        }

        frameRef.current = data as FrameMsg;
      } catch { /* malformed frame, skip */ }
    };

    ws.onerror = () => {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
      setPhase(p => {
        if (p !== "live") {
          setErrorMsg("Connection lost. Is the backend running?");
          return "error";
        }
        return p;
      });
      ws.close();
    };
  }, [year, round, resetState]);

  const stopReplay = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setPhase("idle");
    resetState();
  }, [resetState]);

  useEffect(() => () => {
    esRef.current?.close();
    cancelAnimationFrame(rafRef.current);
  }, []);

  // Build SVG path with adaptive gap threshold
  const buildPath = useCallback((pts: [number, number][], gapMult = 6): string => {
    if (pts.length < 2) return "";
    const sv = pts.map(([rx, ry]) => toSvg(rx, ry));
    const gaps: number[] = [];
    for (let i = 1; i < sv.length; i++) {
      const dx = sv[i][0] - sv[i-1][0], dy = sv[i][1] - sv[i-1][1];
      gaps.push(Math.sqrt(dx*dx + dy*dy));
    }
    gaps.sort((a, b) => a - b);
    const median  = gaps[Math.floor(gaps.length / 2)];
    const maxGap2 = (median * gapMult) ** 2;

    let d = "";
    for (let i = 0; i < sv.length; i++) {
      const [sx, sy] = sv[i];
      if (i === 0) {
        d += `M${sx.toFixed(1)},${sy.toFixed(1)}`;
      } else {
        const dx = sx - sv[i-1][0], dy = sy - sv[i-1][1];
        d += (dx*dx + dy*dy > maxGap2)
          ? `M${sx.toFixed(1)},${sy.toFixed(1)}`
          : `L${sx.toFixed(1)},${sy.toFixed(1)}`;
      }
    }
    return d;
  }, [toSvg]);

  const trackPath = useMemo(() => buildPath(trackPts, 6), [trackPts, buildPath]);

  const selectedRace = races.find(r => r.round === round);

  return (
    <main className="min-h-screen pt-20 pb-8 px-3 sm:px-4" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-[1440px] mx-auto flex flex-col gap-5">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-8 bg-red-600" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-red-600">Race Replay</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
            Track Map
          </h1>
        </motion.div>

        {/* RACE SELECTOR */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-[2rem] border p-3 flex flex-wrap items-center gap-3"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 px-4 border-r" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Season</span>
            <select
              value={year}
              onChange={e => { setYear(e.target.value); stopReplay(); }}
              className="bg-transparent font-black italic text-base outline-none cursor-pointer"
              style={{ color: "#E10600" }}
            >
              {[2026,2025,2024,2023,2022,2021,2020].map(y => (
                <option key={y} value={String(y)} style={{ background: "#0a0a0a" }}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color: "var(--text-3)" }}>Race</span>
            {racesLoading ? (
              <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>Loading…</span>
            ) : (
              <select
                value={round}
                onChange={e => { setRound(e.target.value); if (phase === "live") stopReplay(); }}
                className="bg-transparent font-black italic text-base outline-none flex-1 min-w-0 truncate cursor-pointer"
                style={{ color: "var(--text)" }}
              >
                {races.map(r => (
                  <option key={r.round} value={r.round} style={{ background: "#0a0a0a" }}>
                    R{r.round} · {r.raceName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {phase === "idle" || phase === "error" ? (
            <button
              onClick={startReplay}
              disabled={!round || racesLoading}
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40"
              style={{ background: "#E10600", boxShadow: "0 0 24px rgba(225,6,0,0.4)" }}
            >Load Replay</button>
          ) : phase === "loading" ? (
            <button
              onClick={stopReplay}
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            >Cancel</button>
          ) : (
            <button
              onClick={stopReplay}
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            >Stop</button>
          )}
        </motion.div>

        {/* STATUS BANNERS */}
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl border p-4 flex items-center gap-4"
              style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" }}
            >
              <div className="w-5 h-5 rounded-full border-2 border-transparent shrink-0"
                style={{ borderTopColor: "#3b82f6", animation: "spin 0.7s linear infinite" }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#60a5fa" }}>{loadMsg}</p>
                <p className="text-[9px] mt-0.5 font-mono" style={{ color: "var(--text-3)" }}>
                  First load 2–5 min · cached: instant · {elapsed}s elapsed
                </p>
              </div>
            </motion.div>
          )}
          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl border p-4"
              style={{ background: "rgba(225,6,0,0.06)", borderColor: "rgba(225,6,0,0.25)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Connection Failed</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>{errorMsg}</p>
              <code className="block text-[9px] font-mono mt-2 px-3 py-2 rounded"
                style={{ background: "var(--card)", color: "var(--text-2)" }}>
                cd backend && source venv/bin/activate && uvicorn main:app --port 8000
              </code>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EVENT BANNER */}
        {(leaderData?.eventName || selectedRace) && phase === "live" && (
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 rounded-2xl border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Live Replay</span>
            </div>
            <span className="text-sm font-black italic uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              {leaderData?.eventName ?? selectedRace?.raceName}
            </span>
            {leaderData && (
              <>
                <span className="text-[9px] font-mono ml-auto" style={{ color: "var(--text-3)" }}>
                  Lap {leaderData.session.lap}/{leaderData.session.total_laps}
                </span>
                <span className="text-[9px] font-mono" style={{ color: "var(--text-3)" }}>{leaderData.session.time}</span>
                {leaderData.session.leader && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                    style={{ background: "rgba(225,6,0,0.1)", color: "#E10600", border: "1px solid rgba(225,6,0,0.2)" }}>
                    P1 {leaderData.session.leader}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* PROGRESS BAR — direct DOM ref, no React state */}
        {phase === "live" && (
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div ref={progressRef} style={{ width: "0%", height: "100%", background: "#E10600", borderRadius: 9999 }} />
          </div>
        )}

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

          {/* LEADERBOARD */}
          <div className="rounded-[1.5rem] border overflow-hidden flex flex-col"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: "var(--border)" }}>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-600">Race Order</span>
              {leaderData?.session.leader && (
                <span className="text-[9px] font-mono" style={{ color: "var(--text-3)" }}>
                  Lead: {leaderData.session.leader}
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1 max-h-[300px] lg:max-h-[540px]">
              {!leaderData?.sorted.length ? (
                <div className="flex flex-col items-center justify-center h-40">
                  {phase === "idle" && (
                    <span className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--text-4)" }}>
                      Select race &amp; load
                    </span>
                  )}
                  {phase === "loading" && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-transparent"
                        style={{ borderTopColor: "var(--text-3)", animation: "spin 0.7s linear infinite" }} />
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-4)" }}>Awaiting data…</span>
                    </div>
                  )}
                </div>
              ) : leaderData.sorted.map(([code, d]) => (
                <LeaderRow key={code} code={code} d={d} />
              ))}
            </div>

            {/* Tyre legend */}
            <div className="px-4 py-2.5 border-t flex items-center gap-3 flex-wrap shrink-0"
              style={{ borderColor: "var(--border)" }}>
              {Object.entries(TYRE).map(([, v]) => (
                <div key={v.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                  <span className="text-[7px] font-mono font-black uppercase" style={{ color: "var(--text-3)" }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TRACK MAP */}
          <div
            className="rounded-[1.5rem] border overflow-hidden relative"
            style={{ background: "rgba(4,4,4,0.97)", borderColor: "var(--border)" }}
          >
            {/* Idle / loading overlay */}
            {phase !== "live" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                {phase === "idle" && (
                  <>
                    <div className="text-[9px] font-black uppercase tracking-[0.5em] italic" style={{ color: "var(--text-4)" }}>
                      No active replay
                    </div>
                    <button
                      onClick={startReplay}
                      disabled={!round || racesLoading}
                      className="px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-40"
                      style={{ background: "#E10600", boxShadow: "0 0 28px rgba(225,6,0,0.35)" }}
                    >Load Replay</button>
                  </>
                )}
                {phase === "loading" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-transparent"
                      style={{ borderTopColor: "#E10600", animation: "spin 0.7s linear infinite" }} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--text-3)" }}>
                      {loadMsg}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "var(--text-4)" }}>
                      {elapsed}s · first load 2–5 min
                    </span>
                  </div>
                )}
                {phase === "error" && (
                  <span className="text-[10px] font-black uppercase tracking-widest italic text-red-500">Backend offline</span>
                )}
              </div>
            )}

            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full sm:min-h-[480px]"
              style={{ minHeight: 280, display: "block" }}
            >
              {/* Track */}
              {trackPath && (
                <path d={trackPath} fill="none"
                  stroke="rgba(255,255,255,0.18)" strokeWidth="5"
                  strokeLinejoin="round" strokeLinecap="round" />
              )}

              {/* Watermark */}
              <text x={SVG_W / 2} y={SVG_H / 2 + 16} textAnchor="middle"
                fill="rgba(255,255,255,0.015)" fontSize="52" fontWeight="900" fontFamily="monospace">
                PITWALL
              </text>

              {/* Safety car */}
              <g
                ref={(el) => { scRef.current = el; }}
                style={{ display: "none", transition: "transform 90ms linear", willChange: "transform" }}
              >
                <circle cx={0} cy={0} r={12} fill="rgba(255,200,0,0.18)" />
                <circle cx={0} cy={0} r={7}  fill="#FFD700" />
                <text x={0} y={-14} textAnchor="middle" fill="#FFD700"
                  fontSize="7" fontWeight="900" fontFamily="monospace">SC</text>
              </g>

              {/* Cars */}
              {ALL_DRIVER_CODES.map(code => {
                const color = DRIVER_COLORS[code];
                return (
                  <g
                    key={code}
                    ref={(el) => { if (el) carRefs.current.set(code, el); else carRefs.current.delete(code); }}
                    style={{ display: "none", transition: "transform 90ms linear", willChange: "transform" }}
                  >
                    <circle cx={0} cy={0} r={10} fill={color} opacity={0.15} />
                    <circle cx={0} cy={0} r={5} fill={color} />
                    <circle
                      ref={(el) => { if (el) pitRingRefs.current.set(code, el); else pitRingRefs.current.delete(code); }}
                      cx={0} cy={0} r={9}
                      fill="none"
                      stroke="#FFD700"
                      strokeWidth="1.5"
                      opacity={0.8}
                      style={{ display: "none" }}
                    />
                    <text x={0} y={-11} textAnchor="middle"
                      fill="rgba(0,0,0,0.75)" stroke="rgba(0,0,0,0.75)" strokeWidth="3"
                      fontSize="7" fontWeight="900" fontFamily="monospace" letterSpacing="0.04em">
                      {code}
                    </text>
                    <text x={0} y={-11} textAnchor="middle"
                      fill="white"
                      fontSize="7" fontWeight="900" fontFamily="monospace" letterSpacing="0.04em">
                      {code}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Status dot */}
            <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
              <div className={`w-2 h-2 rounded-full ${
                phase === "live"    ? "bg-green-500 animate-pulse" :
                phase === "loading" ? "bg-yellow-500 animate-pulse" :
                "bg-zinc-600"
              }`} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                {phase === "live" ? "Live" : phase === "loading" ? "Loading" : "Offline"}
              </span>
            </div>

            {/* Safety car banner */}
            {leaderData?.trackStatus === "4" && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                style={{ background: "rgba(255,200,0,0.12)", color: "#FFD700", border: "1px solid rgba(255,200,0,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Safety Car
              </div>
            )}
          </div>
        </div>

        {/* STATS ROW */}
        {leaderData && phase === "live" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { label: "Lap",     value: `${leaderData.session.lap}/${leaderData.session.total_laps}` },
              { label: "Leader",  value: leaderData.session.leader || "—" },
              { label: "Avg Spd", value: `${Math.round(leaderData.sorted.reduce((a, b) => a + b[1].speed, 0) / Math.max(1, leaderData.sorted.length))} km/h` },
              { label: "Cars",    value: String(leaderData.sorted.length) },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border px-4 py-3"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
                  {s.label}
                </div>
                <div className="text-xl font-mono font-black italic" style={{ color: "var(--text)" }}>{s.value}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}
