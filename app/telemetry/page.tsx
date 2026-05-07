"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Wifi, WifiOff, Activity, Gauge, Zap, RefreshCw } from "lucide-react";
import { getConstructorColor, getFlagUrl, getDriverPhoto } from "@/components/Podium";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
interface DriverEntry {
  position: string;
  Driver: { code: string; driverId: string; givenName: string; familyName: string; nationality: string };
  Constructor: { name: string };
  points?: string;
  Time?: { time: string };
  status?: string;
  laps?: string;
  grid?: string;
  FastestLap?: { Time?: { time: string }; rank?: string };
}

interface RaceInfo {
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: { circuitId: string; circuitName: string; Location: { locality: string; country: string } };
  Results?: DriverEntry[];
  QualifyingResults?: DriverEntry[];
}

interface RaceStub {
  round: string;
  raceName: string;
  date: string;
}

interface TelemetryPoint {
  lap: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: number;
}

/* ------------------------------------------------------------------ */
/*  HOOKS                                                              */
/* ------------------------------------------------------------------ */
function useSchedule(year: string) {
  const [races, setRaces] = useState<RaceStub[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`)
      .then(r => r.json())
      .then(d => {
        const list: RaceStub[] = (d?.MRData?.RaceTable?.Races ?? []).map((r: any) => ({
          round:    r.round,
          raceName: r.raceName,
          date:     r.date,
        }));
        // Only show past races (telemetry only exists after race)
        const now = new Date();
        setRaces(list.filter(r => new Date(r.date) <= now));
      })
      .catch(() => setRaces([]))
      .finally(() => setLoading(false));
  }, [year]);

  return { races, loading };
}

function useRaceData(year: string, round: string) {
  const [race, setRace] = useState<RaceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!year || !round) return;
    setRace(null);
    setLoading(true);

    Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`).then(r => r.json()),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/qualifying.json`).then(r => r.json()),
    ]).then(([resJson, qualJson]) => {
      const raceData = resJson?.MRData?.RaceTable?.Races?.[0];
      const qualData = qualJson?.MRData?.RaceTable?.Races?.[0];
      if (raceData?.Results?.length) {
        setRace({ ...raceData, Results: raceData.Results });
      } else if (qualData?.QualifyingResults?.length) {
        setRace({ ...qualData, QualifyingResults: qualData.QualifyingResults });
      }
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [year, round]);

  return { race, loading };
}

function useTelemetry(year: string, round: string, driver: string) {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!driver || !round || !year) return;
    setLoading(true);
    try {
      const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
      const res = await fetch(
        `${backendBase}/api/telemetry/${year}/${round}/${driver}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) throw new Error("Backend offline");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const pts: TelemetryPoint[] = (json.Speed ?? []).map((s: number, i: number) => ({
        lap:      i,
        speed:    s,
        throttle: Math.round((json.Throttle?.[i] ?? 0) * 100),
        brake:    json.Brake?.[i] ? 100 : 0,
        gear:     json.nGear?.[i] ?? 0,
        drs:      json.DRS?.[i] ?? 0,
      }));
      setData(pts);
      setConnected(true);
    } catch {
      setConnected(false);
      // Realistic simulated trace
      const sim: TelemetryPoint[] = Array.from({ length: 200 }, (_, i) => {
        const t = i / 200;
        const spd = 170 + Math.sin(t * 14) * 90 + Math.sin(t * 27) * 45 + Math.random() * 12;
        return {
          lap:      i * 9,
          speed:    Math.round(Math.max(80, Math.min(340, spd))),
          throttle: spd > 200 ? Math.round(82 + Math.random() * 18) : Math.round(15 + Math.random() * 45),
          brake:    spd < 170 ? Math.round(35 + Math.random() * 65) : 0,
          gear:     Math.round(spd / 55) + 1,
          drs:      spd > 255 ? 10 : 0,
        };
      });
      setData(sim);
    } finally {
      setLoading(false);
    }
  }, [year, round, driver]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, connected, loading, refresh: fetch_ };
}

/* ------------------------------------------------------------------ */
/*  CUSTOM TOOLTIP                                                     */
/* ------------------------------------------------------------------ */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-mono border"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
      <div>Speed: <span className="text-red-500 font-black">{d?.speed} km/h</span></div>
      {d?.throttle !== undefined && <div>Throttle: <span style={{ color: "#22c55e" }}>{d.throttle}%</span></div>}
      {d?.brake    !== undefined && <div>Brake:    <span style={{ color: "#ef4444" }}>{d.brake}%</span></div>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DRIVER ROW                                                         */
/* ------------------------------------------------------------------ */
function DriverRow({ entry, pos, isSelected, onClick, showQual }: {
  entry: DriverEntry; pos: number; isSelected: boolean; onClick: () => void; showQual: boolean;
}) {
  const d      = entry.Driver;
  const accent = getConstructorColor(entry.Constructor?.name ?? "");
  const timing = showQual
    ? ((entry as any).Q3 ?? (entry as any).Q2 ?? (entry as any).Q1 ?? "--")
    : (entry.Time?.time ?? entry.status ?? "--");

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: pos * 0.02 }}
      className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all"
      style={{
        background:  isSelected ? `${accent}18` : "transparent",
        borderColor: isSelected ? accent : "transparent",
        boxShadow:   isSelected ? `0 0 16px ${accent}28` : "none",
      }}
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <span className="font-mono font-black text-xs w-5 text-center shrink-0" style={{ color: accent }}>
        {entry.position ?? pos + 1}
      </span>
      <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-900 border shrink-0" style={{ borderColor: `${accent}40` }}>
        <img
          src={getDriverPhoto(d.driverId, d.code)}
          className="w-full h-full object-cover"
          alt={d.familyName}
          onError={(e) => {
            const t = e.currentTarget;
            const flag = getFlagUrl(d.nationality);
            if (t.src !== flag) { t.src = flag; t.style.transform = "scale(1.8)"; }
          }}
        />
      </div>
      <div className="w-0.5 h-8 rounded-full shrink-0" style={{ background: accent }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-black uppercase tracking-tight" style={{ color: "var(--text)" }}>
          {d.givenName[0]}. {d.familyName}
        </div>
        <div className="text-[9px] font-bold uppercase truncate" style={{ color: "var(--text-3)" }}>
          {entry.Constructor?.name}
        </div>
      </div>
      <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-2)" }}>{timing}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  TELEMETRY CHART                                                    */
/* ------------------------------------------------------------------ */
function TelemetryChart({ data, connected }: { data: TelemetryPoint[]; connected: boolean }) {
  const [activeMetric, setActiveMetric] = useState<"speed" | "throttle_brake">("speed");

  if (!data.length) return (
    <div className="h-40 flex items-center justify-center" style={{ color: "var(--text-3)" }}>
      <span className="text-[11px] font-black uppercase tracking-widest">Awaiting telemetry...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: "speed",          label: "Speed Trace" },
          { key: "throttle_brake", label: "Pedal Trace" },
        ] as const).map(m => (
          <button key={m.key} onClick={() => setActiveMetric(m.key)}
            className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all"
            style={{
              background:  activeMetric === m.key ? "#E10600" : "var(--card)",
              borderColor: activeMetric === m.key ? "#E10600" : "var(--border)",
              color:       activeMetric === m.key ? "#fff" : "var(--text-2)",
            }}>
            {m.label}
          </button>
        ))}
        {!connected && (
          <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border"
            style={{ borderColor: "rgba(234,179,8,0.3)", color: "rgba(234,179,8,0.7)", background: "rgba(234,179,8,0.06)" }}>
            Simulated
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={168}>
        {activeMetric === "speed" ? (
          <AreaChart data={data.slice(0, 200)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#E10600" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#E10600" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="lap" hide />
            <YAxis domain={[0, 360]} tick={{ fontSize: 9, fill: "var(--text-3)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="speed" stroke="#E10600" strokeWidth={1.5} fill="url(#speedGrad)" dot={false} />
          </AreaChart>
        ) : (
          <LineChart data={data.slice(0, 200)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="lap" hide />
            <YAxis domain={[0, 110]} tick={{ fontSize: 9, fill: "var(--text-3)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="throttle" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="brake"    stroke="#ef4444" strokeWidth={1.5} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 text-[9px] font-bold uppercase">
        {activeMetric === "speed" ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-600 inline-block" />
            <span style={{ color: "var(--text-3)" }}>Speed (km/h)</span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-green-500 inline-block" />
              <span style={{ color: "var(--text-3)" }}>Throttle %</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-400 inline-block" />
              <span style={{ color: "var(--text-3)" }}>Brake %</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function TelemetryPage() {
  const [year,  setYear]  = useState("2026");
  const [round, setRound] = useState("");

  const { races, loading: scheduleLoding } = useSchedule(year);
  const { race, loading: raceLoding }      = useRaceData(year, round);

  const [selectedDriver, setSelectedDriver] = useState<DriverEntry | null>(null);

  const entries: DriverEntry[] = race?.Results ?? race?.QualifyingResults ?? [];
  const showQual = !!race?.QualifyingResults && !race?.Results;

  const driverCode = selectedDriver?.Driver?.code ?? "";
  const { data: telemetry, connected, loading: telemLoding, refresh } = useTelemetry(year, round, driverCode);

  // Auto-select latest past race
  useEffect(() => {
    if (races.length > 0 && !round) {
      setRound(races[races.length - 1].round);
    }
  }, [races, round]);

  // Auto-select first driver
  useEffect(() => {
    if (entries.length > 0 && !selectedDriver) setSelectedDriver(entries[0]);
  }, [entries]);

  // Reset driver when round changes
  useEffect(() => { setSelectedDriver(null); }, [round, year]);

  const maxSpeed    = telemetry.length ? Math.max(...telemetry.map(d => d.speed)) : 0;
  const avgThrottle = telemetry.length ? Math.round(telemetry.reduce((a, b) => a + b.throttle, 0) / telemetry.length) : 0;
  const drsActs     = telemetry.filter(d => d.drs > 0).length;

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-10 bg-red-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-red-600">
              Driver Telemetry
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
            Telemetry
          </h1>
        </motion.div>

        {/* ── RACE SELECTOR ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-[2rem] border p-3 flex flex-wrap items-center gap-3"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          {/* Year */}
          <div className="flex items-center gap-2 px-4 border-r" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Season</span>
            <select
              value={year}
              onChange={e => { setYear(e.target.value); setRound(""); }}
              className="bg-transparent font-black italic text-base outline-none cursor-pointer"
              style={{ color: "#E10600" }}
            >
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                <option key={y} value={String(y)} style={{ background: "#0a0a0a" }}>{y}</option>
              ))}
            </select>
          </div>

          {/* Round */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color: "var(--text-3)" }}>Race</span>
            {scheduleLoding ? (
              <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>Loading...</span>
            ) : (
              <select
                value={round}
                onChange={e => setRound(e.target.value)}
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

          {/* Backend badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest"
            style={{
              background:  connected ? "rgba(34,197,94,0.08)" : "var(--card)",
              borderColor: connected ? "rgba(34,197,94,0.3)" : "var(--border)",
              color:       connected ? "#22c55e" : "var(--text-3)",
            }}>
            {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {connected ? "FastF1" : "Simulated"}
          </div>
        </motion.div>

        {/* ── RACE INFO ── */}
        {race && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
            className="rounded-[2rem] border p-5 flex flex-wrap items-center gap-5"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
                Round {race.round} · {year}
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter" style={{ color: "var(--text)" }}>
                {race.raceName}
              </h2>
            </div>
            <div className="h-8 w-px hidden sm:block" style={{ background: "var(--border)" }} />
            <div className="hidden sm:block">
              <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Circuit</div>
              <div className="text-sm font-bold" style={{ color: "var(--text-2)" }}>{race.Circuit?.circuitName}</div>
            </div>
            <div className="h-8 w-px hidden sm:block" style={{ background: "var(--border)" }} />
            <div className="hidden sm:block">
              <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Location</div>
              <div className="text-sm font-bold" style={{ color: "var(--text-2)" }}>
                {race.Circuit?.Location?.locality}, {race.Circuit?.Location?.country}
              </div>
            </div>
            <div className="h-8 w-px hidden sm:block" style={{ background: "var(--border)" }} />
            <div className="hidden sm:block">
              <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Date</div>
              <div className="text-sm font-bold" style={{ color: "var(--text-2)" }}>
                {new Date(race.date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}
              </div>
            </div>
            <div className="ml-auto px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
              style={{ background: "var(--card-hover)", borderColor: "var(--border)", color: "var(--text-3)" }}>
              {showQual ? "Qualifying" : "Race"} Data
            </div>
          </motion.div>
        )}

        {/* ── LOADING RACES ── */}
        {raceLoding && !race && (
          <div className="rounded-[2rem] border p-8 flex items-center justify-center gap-3"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="w-4 h-4 rounded-full border-2 border-transparent"
              style={{ borderTopColor: "#E10600", animation: "spin 0.7s linear infinite" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
              Loading race data...
            </span>
          </div>
        )}

        {/* ── MAIN 2-COLUMN ── */}
        {(race || raceLoding) && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

            {/* Driver list */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
              className="rounded-[2rem] border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                  {showQual ? "Qualifying" : "Race"} Classification
                </span>
                <span className="text-[9px] font-mono" style={{ color: "var(--text-3)" }}>
                  {entries.length} drivers
                </span>
              </div>
              <div className="p-3 space-y-1 max-h-[540px] overflow-y-auto custom-scrollbar">
                {entries.length > 0 ? entries.map((entry, i) => (
                  <DriverRow
                    key={entry.Driver?.driverId ?? i}
                    entry={entry}
                    pos={i}
                    isSelected={selectedDriver?.Driver?.driverId === entry.Driver?.driverId}
                    onClick={() => setSelectedDriver(entry)}
                    showQual={showQual}
                  />
                )) : (
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-2xl skeleton" />
                  ))
                )}
              </div>
            </motion.div>

            {/* Right panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}
              className="space-y-5"
            >
              <AnimatePresence mode="wait">
                {selectedDriver ? (
                  <motion.div key={selectedDriver.Driver.driverId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-5">
                    {/* Driver card */}
                    <div className="rounded-[2rem] border p-6 flex items-center gap-5"
                      style={{
                        background:  "var(--card)",
                        borderColor: `${getConstructorColor(selectedDriver.Constructor?.name ?? "")}40`,
                        borderLeft:  `4px solid ${getConstructorColor(selectedDriver.Constructor?.name ?? "")}`,
                      }}>
                      <div className="w-16 h-16 rounded-full overflow-hidden border shrink-0"
                        style={{ borderColor: `${getConstructorColor(selectedDriver.Constructor?.name ?? "")}50` }}>
                        <img
                          src={getDriverPhoto(selectedDriver.Driver.driverId, selectedDriver.Driver.code)}
                          className="w-full h-full object-cover"
                          alt={selectedDriver.Driver.familyName}
                          onError={(e) => {
                            const t = e.currentTarget;
                            const flag = getFlagUrl(selectedDriver.Driver.nationality);
                            if (t.src !== flag) { t.src = flag; t.style.transform = "scale(1.8)"; }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest mb-1"
                          style={{ color: getConstructorColor(selectedDriver.Constructor?.name ?? "") }}>
                          {selectedDriver.Constructor?.name}
                        </div>
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
                          {selectedDriver.Driver.familyName}
                        </h2>
                        <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "var(--text-3)" }}>
                          {selectedDriver.Driver.givenName} · {selectedDriver.Driver.nationality}
                        </div>
                      </div>
                      <button onClick={refresh}
                        className="p-3 rounded-full border transition-all hover:scale-110 cursor-pointer"
                        style={{ background: "var(--card-hover)", borderColor: "var(--border)", color: "var(--text-2)" }}>
                        <RefreshCw size={14} className={telemLoding ? "animate-spin" : ""} />
                      </button>
                    </div>

                    {/* Stat tiles */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Top Speed",    value: maxSpeed    ? `${maxSpeed}`    : "--", unit: "km/h", icon: <Gauge    size={16} />, color: "#E10600" },
                        { label: "Avg Throttle", value: avgThrottle ? `${avgThrottle}` : "--", unit: "%",    icon: <Zap      size={16} />, color: "#22c55e" },
                        { label: "DRS Zones",    value: drsActs     ? `${drsActs}`     : "--", unit: "acts", icon: <Activity size={16} />, color: "#3b82f6" },
                      ].map(s => (
                        <div key={s.label} className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                          <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                            {s.icon}
                            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{s.label}</span>
                          </div>
                          <div className="text-3xl font-mono font-black italic" style={{ color: "var(--text)" }}>{s.value}</div>
                          <div className="text-[8px] font-bold uppercase mt-0.5" style={{ color: "var(--text-3)" }}>{s.unit}</div>
                        </div>
                      ))}
                    </div>

                    {/* Telemetry chart */}
                    <div className="rounded-[2rem] border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                        <div>
                          <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                            Fastest Lap Telemetry
                          </h3>
                          <p className="text-[9px] mt-0.5" style={{ color: "var(--text-3)" }}>
                            {connected
                              ? "FastF1 live data · fastest lap"
                              : "Simulated trace — start backend for live data"}
                          </p>
                        </div>
                      </div>
                      <TelemetryChart data={telemetry} connected={connected} />
                    </div>

                    {/* Backend offline notice */}
                    {!connected && (
                      <div className="rounded-2xl border p-4 flex items-start gap-3"
                        style={{ background: "rgba(59,130,246,0.04)", borderColor: "rgba(59,130,246,0.15)" }}>
                        <WifiOff size={14} className="shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#3b82f6" }}>
                            FastF1 Backend Offline
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                            Showing simulated trace. Run{" "}
                            <code className="font-mono px-1 rounded text-[9px]" style={{ background: "var(--card-hover)" }}>
                              uvicorn main:app --port 8000
                            </code>{" "}
                            inside{" "}
                            <code className="font-mono px-1 rounded text-[9px]" style={{ background: "var(--card-hover)" }}>
                              /backend
                            </code>{" "}
                            for live data.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-[2rem] border flex items-center justify-center h-64"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-30" style={{ color: "var(--text)" }}>
                      Select a driver to view telemetry
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!race && !raceLoding && !round && (
          <div className="rounded-[2rem] border flex items-center justify-center h-64"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-20" style={{ color: "var(--text)" }}>
              Select a season and race above
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
