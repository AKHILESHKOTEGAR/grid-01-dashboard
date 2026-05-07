# GRID.01 — F1 Immersive Analytics Platform

An unofficial Formula 1 fan platform built with Next.js 15 and FastAPI. Real-time race data, live telemetry charts, multi-driver comparisons, team dossiers, and a full race replay with animated track map — all in a single dark-themed web app styled after the official F1 aesthetic.

---

## Features

| Section | What it does |
|---|---|
| **Dashboard** | Latest race results, driver + constructor standings, auto-selects most recent completed race |
| **Paddock** | All 11 constructors with live standings, driver lineups with photos, key personnel, HQ data |
| **Team Dossier** | Per-team page: championship history, recent race performance, driver photo cards |
| **Telemetry** | Fastest-lap telemetry charts (speed trace, throttle/brake) via FastF1 with year + round selector |
| **Replay** | Animated SVG track map streaming all 20 cars at 5× playback speed, pit lane overlay, per-driver labels |
| **Labs / Compare** | Multi-driver head-to-head lap time, sector, and telemetry comparison |

---

## Tech Stack

### Frontend — Next.js 15 (App Router)
- React 19, TypeScript, Tailwind CSS
- Framer Motion for page and card animations
- Recharts for telemetry charts
- EventSource / Server-Sent Events for live replay stream
- Jolpica/Ergast REST API for race results and standings (no API key)

### Backend — FastAPI + uvicorn
- FastF1 3.x for official F1 telemetry and lap data
- `multiprocessing.Pool` — parallel per-driver telemetry loading (20 workers)
- Pre-built frame arrays (~10 000 frames/race) streamed via SSE at 10 fps
- In-memory cache keyed by `year_round` (replay) and `year_round_driver` (telemetry)
- NumPy resampling + linear interpolation onto a common 10 fps timeline
- NaN masking for retired/DNF drivers — they disappear instead of freezing

---

## Getting Started

### 1. Frontend

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 2. Backend (required for Replay and Telemetry live data)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install fastapi uvicorn fastf1 pandas numpy
uvicorn main:app --port 8000
# → http://localhost:8000
```

> **First replay load takes 2–5 minutes.** FastF1 downloads and caches race telemetry locally. Subsequent loads for the same race are near-instant (in-memory cache). Telemetry page also falls back to a simulated trace when backend is offline.

---

## Project Structure

```
f1-immersive/
├── app/
│   ├── page.tsx                  # Dashboard — results + standings
│   ├── paddock/page.tsx          # Team grid with live constructor standings
│   ├── teams/[id]/page.tsx       # Team dossier — stats, personnel, drivers
│   ├── telemetry/page.tsx        # Per-driver fastest-lap telemetry
│   ├── replay/page.tsx           # SVG track map race replay
│   ├── compare/page.tsx          # Multi-driver comparison (Labs)
│   └── api/replay-stream/        # Next.js SSE proxy → FastAPI backend
├── components/
│   ├── Navbar.tsx                # Floating nav + live clock
│   ├── Podium.tsx                # Race results, standings, asset helpers
│   └── ThemeProvider.tsx
├── libs/
│   └── teams.ts                  # 2026 constructor data (drivers, personnel, HQ)
├── public/
│   ├── drivers/                  # Driver headshots  (CODE.png e.g. NOR.png)
│   └── teams/grid/               # Constructor logos (SVG / PNG)
└── backend/
    └── main.py                   # FastAPI: SSE replay stream, telemetry, schedule
```

---

## Architecture: Replay Pipeline

```
FastF1 cache
    │
    ▼
multiprocessing.Pool (20 drivers in parallel)
    │  per-lap telemetry → concat → sort by session time
    ▼
np.interp → resample onto shared 10 fps timeline (5× playback)
    │  NaN mask outside each driver's data range
    ▼
Pre-build ALL frames in memory (~10 000 frames per race)
Extract: bounds (1st–99th percentile), track ghost, pit lane path
    │
    ▼
FastAPI SSE stream  →  Next.js /api/replay-stream proxy  →  EventSource
    │  100 ms per frame (10 fps)
    ▼
SVG <g transform="translate(x,y)"> + CSS transition 90ms linear
    → browser interpolates at 60 fps for smooth movement
```

---

## Data Sources

| Source | Used for | Rate |
|---|---|---|
| `api.jolpi.ca/ergast` | Results, standings, schedule | Polled 60 s (Paddock) / 5 min (Dashboard) |
| FastF1 (local cache) | Telemetry, lap times, GPS coords | On-demand, cached in `backend/.fastf1-cache/` |

No API keys required. All data sources are public.

---

## Requirements

- Node.js 18+
- Python 3.10+
- ~2 GB disk for FastF1 race cache (grows per race loaded)

---

*GRID.01 is an unofficial fan project. Not affiliated with Formula 1, FOM, or any constructor.*
