"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  PodiumCard,
  RaceResultsList,
  QualifyingResultsList,
  SeasonStandings,
  SprintResultsList,
  CircuitDisplay,
  getConstructorColor,
  getDriverPhoto,
} from "@/components/Podium";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

/* ── localStorage cache ──────────────────────────────────────────────── */
const S_TTL = 30 * 60_000;   // schedule: 30 min
const R_TTL = 5  * 60_000;   // results:  5 min

function cset(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ d: val, t: Date.now() })); } catch {}
}
function cget<T>(key: string, ttl = Infinity): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw);
    return Date.now() - t < ttl ? (d as T) : null;
  } catch { return null; }
}

function latestRound(races: any[]): any | null {
  const past = races.filter(r => new Date(r.date) <= new Date());
  return past.length ? past[past.length - 1] : (races[0] ?? null);
}

// Lazy-load 3D scene to avoid SSR issues
const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });


/* ------------------------------------------------------------------ */
/*  HOME PAGE                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  const { isDark } = useTheme();

  const [year, setYear] = useState("2026");
  const [races, setRaces] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState("1");
  const [viewMode, setViewMode] = useState<"race" | "standings">("race");
  const [sessionMode, setSessionMode] = useState<"race" | "qualifying" | "sprint">("race");

  const [raceResults, setRaceResults] = useState<any>(null);
  const [qualifyingResults, setQualifyingResults] = useState<any>(null);
  const [sprintResults, setSprintResults] = useState<any>(null);
  const [driverStandings, setDriverStandings] = useState<any[]>([]);
  const [teamStandings, setTeamStandings] = useState<any[]>([]);

  const activeInfo = useMemo(() => {
    const sessionData = raceResults ?? qualifyingResults ?? sprintResults;
    if (sessionData) return sessionData;
    return races.find((r: any) => r.round === selectedRound);
  }, [raceResults, qualifyingResults, sprintResults, races, selectedRound]);

  const isUpcoming = useMemo(() => {
    if (!activeInfo?.date) return false;
    return new Date(activeInfo.date) > new Date();
  }, [activeInfo]);

  const activeColor = useMemo(() => {
    const winnerName = raceResults?.Results?.[0]?.Constructor?.name ?? teamStandings[0]?.Constructor?.name ?? "";
    return getConstructorColor(winnerName);
  }, [raceResults, teamStandings]);

  // Restore persisted year on mount (client-only)
  useEffect(() => {
    const saved = localStorage.getItem("g01_year");
    if (saved && saved !== year) setYear(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule + standings — stale-while-revalidate, AbortController cancels on quick switch
  useEffect(() => {
    localStorage.setItem("g01_year", year);

    // ① Instant: show cached schedule
    const cached = cget<any[]>(`g01_sched_${year}`, S_TTL);
    if (cached?.length) {
      setRaces(cached);
      const lr = latestRound(cached);
      if (lr) setSelectedRound(lr.round);
    }

    const ac = new AbortController();

    // ② Fresh schedule
    fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`, { signal: ac.signal })
      .then(r => r.json())
      .then(d => {
        const list: any[] = d?.MRData?.RaceTable?.Races ?? [];
        if (!list.length) return;
        setRaces(list);
        cset(`g01_sched_${year}`, list);
        const lr = latestRound(list);
        if (lr) setSelectedRound(lr.round);
      }).catch(() => {});

    // ③ Fresh standings (parallel)
    const fetchStandings = (signal: AbortSignal) => {
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`, { signal })
        .then(r => r.json())
        .then(d => {
          const l = d?.MRData?.StandingsTable?.StandingsLists ?? [];
          const s = l[l.length - 1]?.DriverStandings ?? [];
          if (s.length) setDriverStandings(s);
        }).catch(() => {});
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`, { signal })
        .then(r => r.json())
        .then(d => {
          const l = d?.MRData?.StandingsTable?.StandingsLists ?? [];
          const s = l[l.length - 1]?.ConstructorStandings ?? [];
          if (s.length) setTeamStandings(s);
        }).catch(() => {});
    };

    fetchStandings(ac.signal);
    const interval = setInterval(() => fetchStandings(new AbortController().signal), 5 * 60_000);

    return () => { ac.abort(); clearInterval(interval); };
  }, [year]);

  // Results — stale-while-revalidate, AbortController cancels stale fetches on quick switch
  useEffect(() => {
    if (!selectedRound) return;
    const cKey = `g01_res_${year}_${selectedRound}`;
    const ac   = new AbortController();

    // ① Instant: show cached results (don't clear while loading)
    const cached = cget<{ r: any; q: any; s: any }>(cKey, R_TTL);
    if (cached) {
      setRaceResults(cached.r);
      setQualifyingResults(cached.q);
      setSprintResults(cached.s);
    }

    // ② Always fetch fresh in background
    const fresh: { r: any; q: any; s: any } = { r: null, q: null, s: null };
    const load = (ep: string, setter: (v: any) => void, k: keyof typeof fresh) =>
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${selectedRound}/${ep}.json`, { signal: ac.signal })
        .then(res => res.json())
        .then(d => { const v = d?.MRData?.RaceTable?.Races?.[0] ?? null; setter(v); fresh[k] = v; })
        .catch(() => {});

    Promise.all([
      load("results",   setRaceResults,       "r"),
      load("qualifying", setQualifyingResults, "q"),
      load("sprint",    setSprintResults,      "s"),
    ]).then(() => { if (!ac.signal.aborted) cset(cKey, fresh); });

    return () => ac.abort();
  }, [year, selectedRound]);

  const results = useMemo(() => {
    if (sessionMode === "qualifying") return qualifyingResults?.QualifyingResults;
    if (sessionMode === "sprint") return sprintResults?.SprintResults;
    return raceResults?.Results;
  }, [sessionMode, raceResults, qualifyingResults, sprintResults]);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* 3D BACKGROUND */}
      <div className="fixed inset-0 z-0" style={{ opacity: isDark ? 0.45 : 0.35 }}>
        <Scene3D teamColor={activeColor} isDark={isDark} />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 pt-24 px-4 sm:px-6 max-w-7xl mx-auto min-h-screen overflow-y-auto custom-scrollbar flex flex-col">

        {/* ---- RACE SELECTOR BAR ---- */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 p-2 rounded-[2rem] border mb-8 shadow-2xl backdrop-blur-2xl"
          style={{
            background: isDark ? "rgba(5,5,5,0.7)" : "rgba(255,255,255,0.7)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 pl-4 pr-4 border-r" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Season</span>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="bg-transparent font-black italic text-base outline-none cursor-pointer"
              style={{ color: "#E10600" }}
              suppressHydrationWarning
            >
              {Array.from({ length: 77 }, (_, i) => 2026 - i).map(y => (
                <option key={y} value={String(y)} style={{ background: isDark ? "#0a0a0a" : "#fff" }}>{y}</option>
              ))}
            </select>
          </div>
          <select
            value={selectedRound}
            onChange={e => setSelectedRound(e.target.value)}
            className="bg-transparent font-black italic text-base outline-none flex-1 truncate cursor-pointer"
            style={{ color: "var(--text)" }}
          >
            {races.map((r: any) => (
              <option key={r.round} value={r.round} style={{ background: isDark ? "#0a0a0a" : "#fff" }}>{r.raceName}</option>
            ))}
          </select>
        </motion.div>

        {/* ---- VIEW TABS ---- */}
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 mb-10"
          >
            {/* Main toggle */}
            <div className="p-1.5 rounded-full border flex backdrop-blur-md"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              {[
                { key: "race", label: "Race Weekend" },
                { key: "standings", label: "Season Standings" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as any)}
                  className="px-4 sm:px-8 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all"
                  style={{
                    background: viewMode === tab.key ? "#E10600" : "transparent",
                    color: viewMode === tab.key ? "#fff" : "var(--text-3)",
                    boxShadow: viewMode === tab.key ? "0 0 22px rgba(225,6,0,0.45)" : "none",
                  }}
                  suppressHydrationWarning
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Session sub-tabs */}
            {viewMode === "race" && (
              <div className="flex gap-8 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                {["qualifying", "sprint", "race"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSessionMode(mode as any)}
                    className="text-[10px] font-black uppercase tracking-widest transition-all relative pb-1"
                    style={{ color: sessionMode === mode ? "#E10600" : "var(--text-3)" }}
                    suppressHydrationWarning
                  >
                    {mode === "race" ? "Grand Prix" : mode}
                    {sessionMode === mode && (
                      <motion.div
                        layoutId="session-indicator"
                        className="absolute -bottom-3 left-0 right-0 h-[2px] bg-red-600"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---- MAIN CONTENT ---- */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {viewMode === "race" ? (
                <div className="flex flex-col items-center">

                  {/* Race name */}
                  <motion.h2
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xl sm:text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4 sm:mb-8 text-center drop-shadow-2xl"
                    style={{ color: "var(--text)" }}
                  >
                    {activeInfo?.raceName ?? "Upcoming Race"}
                  </motion.h2>

                  {/* Circuit card */}
                  <div
                    className="w-full max-w-5xl rounded-[1.5rem] sm:rounded-[3rem] border p-4 sm:p-8 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden"
                    style={{ background: isDark ? "rgba(5,5,5,0.6)" : "rgba(255,255,255,0.65)", borderColor: "var(--border)", backdropFilter: "blur(60px)" }}
                  >
                    {/* Grid overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }} />

                    <div className="relative z-10">
                      {/* Mobile: compact horizontal strip */}
                      <div className="flex items-center gap-4 lg:hidden">
                        {activeInfo?.Circuit?.circuitId && (
                          <div className="shrink-0 w-[110px] h-[80px] rounded-2xl overflow-hidden border flex items-center justify-center"
                            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <img
                              src={`/circuits/${activeInfo.Circuit.circuitId}-1.svg`}
                              className="w-full h-full object-contain p-2 opacity-80"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = `/circuits/${activeInfo.Circuit.circuitId}.svg`; }}
                              alt=""
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-red-600 text-[9px] font-black uppercase tracking-[0.4em]">
                            {isUpcoming ? "Coming Soon" : "Race Venue"}
                          </span>
                          <h3 className="text-base font-black italic uppercase tracking-tighter leading-tight mt-0.5" style={{ color: "var(--text)" }}>
                            {activeInfo?.Circuit?.circuitName ?? "Circuit"}
                          </h3>
                          <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-3)" }} suppressHydrationWarning>
                            {activeInfo?.date
                              ? new Date(activeInfo.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                              : "TBD"}
                            {" · "}{activeInfo?.Circuit?.Location?.locality ?? ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isUpcoming ? "bg-orange-500" : "bg-red-600"}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isUpcoming ? "text-orange-500" : "text-white/40"}`}>
                              {isUpcoming ? "Upcoming" : "Completed"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop: original 2-col layout */}
                      <div className="hidden lg:grid grid-cols-2 gap-16 items-center">
                        <div>
                          {activeInfo?.Circuit?.circuitId ? (
                            <CircuitDisplay circuitId={activeInfo.Circuit.circuitId} year={year} />
                          ) : (
                            <div className="w-80 h-48 rounded-[2.5rem] border flex items-center justify-center"
                              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                              <span className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--text-4)" }}>
                                Awaiting Uplink...
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-6 items-end text-right">
                          <div className="space-y-2">
                            <span className="text-red-600 text-[10px] font-black uppercase tracking-[0.6em]">
                              {isUpcoming ? "Coming Soon •" : "Race Venue •"}
                            </span>
                            <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight" style={{ color: "var(--text)" }}>
                              {activeInfo?.Circuit?.circuitName ?? "Circuit Architecture"}
                            </h3>
                            <p className="font-bold uppercase text-[11px] tracking-[0.4em]" style={{ color: "var(--text-2)" }} suppressHydrationWarning>
                              {activeInfo?.date ? new Date(activeInfo.date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }) : "TBD"}
                              {" "}<span style={{ color: "var(--text-4)" }}>•</span>{" "}
                              {activeInfo?.Circuit?.Location?.locality ?? ""}
                            </p>
                          </div>
                          <div className="flex items-center justify-between w-full pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                            <div className="flex flex-col items-start">
                              <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Local Start Time</span>
                              <span className="text-3xl font-mono font-black italic" style={{ color: "var(--text)" }} suppressHydrationWarning>
                                {activeInfo?.date && activeInfo?.time
                                  ? new Date(`${activeInfo.date}T${activeInfo.time}`).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
                                  : "14:00"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${isUpcoming ? "bg-orange-500" : "bg-red-600"}`} />
                              <span className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${isUpcoming ? "text-orange-500" : "text-white/40"}`}>
                                {isUpcoming ? "Upcoming" : "Completed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Podium + results */}
                  {!isUpcoming && results && results.length > 0 && (
                    <div className="mt-6 sm:mt-20 space-y-6 sm:space-y-10 w-full pb-20">

                      {/* Mobile podium — clean stacked cards */}
                      <div className="lg:hidden w-full space-y-2.5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                          <span className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: "var(--text-4)" }}>Podium</span>
                          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                        </div>
                        {[results[0], results[1], results[2]].filter(Boolean).map((driver, idx) => {
                          const pos = idx + 1;
                          const color = getConstructorColor(driver.Constructor?.name ?? "");
                          const medals = ["🥇", "🥈", "🥉"];
                          return (
                            <div key={driver.Driver.driverId}
                              className="flex items-center gap-3 p-3.5 rounded-2xl border"
                              style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: `3px solid ${color}` }}>
                              <span className="text-lg w-7 text-center shrink-0">{medals[idx]}</span>
                              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border" style={{ borderColor: `${color}50` }}>
                                <img
                                  src={getDriverPhoto(driver.Driver.driverId, driver.Driver.code)}
                                  className="w-full h-full object-cover"
                                  alt=""
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color }}>{driver.Constructor?.name}</div>
                                <div className="text-sm font-black italic uppercase tracking-tight" style={{ color: "var(--text)" }}>
                                  {driver.Driver.familyName}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-mono font-black" style={{ color: "var(--text)" }}>{driver.points}</div>
                                <div className="text-[8px] font-bold uppercase" style={{ color: "var(--text-3)" }}>PTS</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop podium — 3D cards */}
                      <div className="hidden lg:block w-full overflow-x-auto pb-4">
                        <div className="flex justify-center items-end gap-8 h-[480px] min-w-max mx-auto px-4">
                          {results[1] && <div className="pb-4"><PodiumCard driver={results[1]} position={2} /></div>}
                          {results[0] && <div className="scale-110 pb-14 z-10"><PodiumCard driver={results[0]} position={1} /></div>}
                          {results[2] && <div className="pb-4"><PodiumCard driver={results[2]} position={3} /></div>}
                        </div>
                      </div>

                      <div>
                        {sessionMode === "qualifying" ? (
                          <QualifyingResultsList results={results} />
                        ) : sessionMode === "sprint" ? (
                          <SprintResultsList results={results} />
                        ) : (
                          <RaceResultsList results={results} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upcoming placeholder */}
                  {isUpcoming && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-16 text-center space-y-4"
                    >
                      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border"
                        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
                          Race not yet started — data will appear post-race
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <SeasonStandings drivers={driverStandings} teams={teamStandings} year={year} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <footer className="mt-auto pt-16 pb-10 flex flex-col items-center gap-4 text-[8px] font-black uppercase tracking-[0.6em] text-center px-4"
          style={{ color: "var(--text-4)" }}>
          <div className="flex flex-col gap-1">
            <p>© 2026 PITWALL • AKHILESH KOTEGAR</p>
            <p style={{ color: "var(--text-3)" }}>WITH LOTS OF LOVE TO MY CO-DRIVER — DUBU</p>
          </div>
          <p className="max-w-2xl leading-relaxed normal-case tracking-widest text-[7px]">
            Unofficial non-commercial fan project. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP,
            GRAND PRIX and related marks are trademarks of Formula One Licensing B.V. All rights reserved.
            Data: Jolpica/Ergast API & FastF1.
          </p>
          <div className="flex gap-6">
            <a href="/impressum" className="hover:text-red-600 transition-colors underline underline-offset-4">Impressum</a>
            <a href="/privacy" className="hover:text-red-600 transition-colors underline underline-offset-4">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
