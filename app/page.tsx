"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Scene3D from "@/components/Scene3D";
import {
  PodiumCard,
  RaceResultsList,
  QualifyingResultsList,
  SeasonStandings,
  SprintResultsList,
  CircuitDisplay,
} from "@/components/Podium";
import { motion } from "framer-motion";

export default function Home() {
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
    const sessionData = raceResults || qualifyingResults || sprintResults;
    if (sessionData) return sessionData;
    return races.find((r: any) => r.round === selectedRound);
  }, [raceResults, qualifyingResults, sprintResults, races, selectedRound]);

  const isUpcoming = useMemo(() => {
    if (!activeInfo?.date) return false;
    return new Date(activeInfo.date) > new Date();
  }, [activeInfo]);

  const activeColor = useMemo(() => {
    // Priority: Winner of current race results, otherwise championship leader
    const winnerConstructor = raceResults?.Results?.[0]?.Constructor?.name ||
      teamStandings[0]?.Constructor?.name || "";

    const name = winnerConstructor.toLowerCase();
    const colors: Record<string, string> = {
      "red bull": "#3671C6", "ferrari": "#E8002D", "mercedes": "#27F4D2",
      "mclaren": "#FF8000", "aston martin": "#229971", "alpine": "#0093CC",
      "williams": "#64C4FF", "haas": "#B6BABD", "rb": "#6692FF",
      "sauber": "#52E252", "audi": "#EB4526", "alphatauri": "#4E7C9B",
      "racing point": "#F596C8", "force india": "#F596C8", "renault": "#FFF500",
      "alfa romeo": "#C92D4B", "toro rosso": "#469BFF",

      // Major Historical Teams
      "lotus": "#FFB800",       // Gold/Black or Green/Gold
      "benetton": "#008860",    // United Colors Green
      "tyrrell": "#001DFF",     // Blue
      "brabham": "#002344",     // Dark Blue
      "march": "#FF69B4",       // Pink
      "jordan": "#FFD700",      // Buzzin' Hornets Yellow
      "ligier": "#26408B",      // French Blue
      "minardi": "#FFEC00",     // Yellow/Black
      "stewart": "#003220",     // Tartan Green
      "jaguar": "#004225",      // British Racing Green
      "bmw sauber": "#FFFFFF",  // BMW White
      "honda": "#FFFFFF",       // Championship White
      "brawn": "#CCFF00",       // Fluorescent Lime
      "toyota": "#E21B23",      // Red/White
      "vanwall": "#004225",     // Original Green
      "cooper": "#004225",
      "brm": "#004225",
      "penske": "#EE1C25"
    };

    const key = Object.keys(colors).find(k => name.includes(k));
    return key ? colors[key] : "#E10600";
  }, [raceResults, teamStandings]);
  useEffect(() => {
    // 1. Reset states immediately to show a clean slate/loading state
    setDriverStandings([]);
    setTeamStandings([]);

    // 2. Fetch the Race Schedule
    fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`)
      .then(res => res.json())
      .then(data => {
        const raceList = data?.MRData?.RaceTable?.Races || [];
        setRaces(raceList);

        // Reset to Round 1 for the new year to prevent 404s on future rounds
        if (raceList.length > 0) {
          setSelectedRound("1");
        }
      })
      .catch(err => console.error("Schedule fetch error:", err));

    // 3. Fetch Driver Standings
    fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`)
      .then(res => res.json())
      .then(data => {
        const standings = data?.MRData?.StandingsTable?.StandingsLists[0]?.DriverStandings || [];
        setDriverStandings(standings);
      })
      .catch(err => console.error("Drivers fetch error:", err));

    // 4. Fetch Constructor Standings
    fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`)
      .then(res => res.json())
      .then(data => {
        const standings = data?.MRData?.StandingsTable?.StandingsLists[0]?.ConstructorStandings || [];
        setTeamStandings(standings);
      })
      .catch(err => console.error("Teams fetch error:", err));

  }, [year]);

  useEffect(() => {
    setRaceResults(null); setQualifyingResults(null); setSprintResults(null);
    const endpoints = ["results", "qualifying", "sprint"];
    const setters = [setRaceResults, setQualifyingResults, setSprintResults];
    endpoints.forEach((ep, i) => {
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${selectedRound}/${ep}.json`)
        .then(res => res.json())
        .then(data => setters[i](data?.MRData?.RaceTable?.Races?.[0] || null));
    });
  }, [year, selectedRound]);

  const results = useMemo(() => {
    if (sessionMode === "qualifying") return qualifyingResults?.QualifyingResults;
    if (sessionMode === "sprint") return sprintResults?.SprintResults;
    return raceResults?.Results;
  }, [sessionMode, raceResults, qualifyingResults, sprintResults]);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden selection:bg-red-600">
      <div className="fixed inset-0 z-0 opacity-40">
        <Scene3D teamColor={activeColor} />
      </div>

      <div className="relative z-10 p-10 max-w-7xl mx-auto h-screen overflow-y-auto custom-scrollbar flex flex-col">
        {/* HEADER */}
        <div className="relative z-50 flex items-center gap-6 p-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] mb-10 shadow-2xl">
          <div className="flex items-center gap-3 pl-6 pr-8 border-r border-white/10">
            <div className="w-1.5 h-8 bg-red-600 rounded-full shadow-[0_0_20px_#ef4444]" />
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">GRID<span className="text-red-600">.01</span></h1>
          </div>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-transparent font-black italic text-xl outline-none text-red-500">
            {Array.from({ length: 77 }, (_, i) => 2026 - i).map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
          <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} className="bg-transparent font-black italic text-xl outline-none flex-1 truncate">
            {races.map((r: any) => <option key={r.round} value={r.round}>{r.raceName}</option>)}
          </select>
          {/* <Link href="/live" className="px-6 py-2 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:border-red-600 transition-all">
            Live Telemetry
          </Link> */}
          <Link href="/compare" className="ml-auto mr-4 px-6 py-2 bg-red-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
            Labs Engine
          </Link>
        </div>

        {/* NAVIGATION */}
        <div className="relative z-50 flex flex-col items-center gap-8 mb-12">
          <div className="bg-white/5 p-1.5 rounded-full border border-white/10 flex backdrop-blur-md">
            <button onClick={() => setViewMode("race")} className={`px-10 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all ${viewMode === "race" ? 'bg-red-600 shadow-[0_0_25px_rgba(225,6,0,0.4)]' : 'text-zinc-500'}`}>RACE WEEKEND</button>
            <button onClick={() => setViewMode("standings")} className={`px-10 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all ${viewMode === "standings" ? 'bg-red-600' : 'text-zinc-500'}`}>SEASON STANDINGS</button>
          </div>

          {viewMode === "race" && (
            <div className="flex gap-10 border-b border-white/10 pb-4">
              {["qualifying", "sprint", "race"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSessionMode(mode as any)}
                  className={`text-[10px] font-black uppercase tracking-widest transition-all relative ${sessionMode === mode ? 'text-red-500 after:absolute after:-bottom-[17px] after:left-0 after:w-full after:h-[2px] after:bg-red-500' : 'text-zinc-500'}`}
                >
                  {mode === "race" ? "Grand Prix" : mode}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN AREA */}
        <div className="relative z-20 flex-1">
          {viewMode === "race" ? (
            <div className="flex flex-col items-center">
              <motion.h2 className="text-6xl font-black italic uppercase tracking-tighter mb-10 text-center drop-shadow-2xl">
                {activeInfo?.raceName || "Upcoming Race"}
              </motion.h2>

              {/* CONTROL CENTER CARD */}
              <div className="w-full max-w-6xl bg-white/5 backdrop-blur-[60px] border border-white/10 rounded-[4rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20" />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="flex flex-col gap-6">
                    {activeInfo?.Circuit?.circuitId ? (
                      <CircuitDisplay circuitId={activeInfo.Circuit.circuitId} year={year} />
                    ) : (
                      <div className="w-80 h-48 bg-white/5 rounded-[2.5rem] animate-pulse flex items-center justify-center border border-white/5">
                        <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest italic">Awaiting Uplink...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col lg:items-end text-center lg:text-right gap-10 flex-1">
                    <div className="space-y-3"> {/* Increased vertical spacing between lines */}
                      <span className="text-red-600 text-xs font-black uppercase tracking-[0.6em] drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                        {isUpcoming ? 'Strategic Architecture •' : 'Race Venue •'}
                      </span>

                      <h3 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-white drop-shadow-2xl">
                        {activeInfo?.Circuit?.circuitName || "Circuit Architecture"}
                      </h3>

                      <p className="text-zinc-400 font-bold uppercase text-xs tracking-[0.4em] pt-2">
                        {activeInfo?.date ? new Date(activeInfo.date).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        }) : 'TBD'} <span className="mx-2 text-zinc-700">•</span> {activeInfo?.Circuit?.Location?.locality || "Global"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between w-full pt-8 border-t border-white/10 mt-4">
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Local Start Time</span>
                        <span className="text-3xl font-mono font-black italic text-white flex items-baseline gap-2">
                          {activeInfo?.date && activeInfo?.time ? (
                            <>
                              {new Date(`${activeInfo.date}T${activeInfo.time}`).toLocaleTimeString(undefined, {
                                hour: '2-digit', minute: '2-digit', hour12: false
                              })}
                              <span className="text-[10px] not-italic text-zinc-500 uppercase tracking-widest font-sans">
                                {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ')}
                              </span>
                            </>
                          ) : "14:00"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${isUpcoming ? 'bg-orange-500 text-orange-500' : 'bg-red-600 text-red-600'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] italic ${isUpcoming ? 'text-orange-500' : 'text-white/40'}`}>
                          {isUpcoming ? "STRATEGIC UPLINK: WILL HAPPEN SOON" : "GRAND PRIX SESSION VERIFIED"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PODIUM & RESULTS LIST */}
              {!isUpcoming && results && results.length > 0 && (
                <div className="mt-24 space-y-10 w-full pb-20">
                  <div className="flex justify-center items-end gap-10 h-[500px]">
                    {results[1] && <div className="pb-6"><PodiumCard driver={results[1]} position={2} /></div>}
                    {results[0] && <div className="scale-110 pb-16 z-10"><PodiumCard driver={results[0]} position={1} /></div>}
                    {results[2] && <div className="pb-6"><PodiumCard driver={results[2]} position={3} /></div>}
                  </div>

                  <div className="relative z-30">
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
            </div>
          ) : (
            <SeasonStandings drivers={driverStandings} teams={teamStandings} year={year} />
          )}
        </div>

        <footer className="relative z-50 mt-auto pt-20 pb-10 flex flex-col items-center gap-6 text-white/30 text-[8px] font-black uppercase tracking-[0.6em] text-center px-4">
          {/* Personal Credits */}
          <div className="flex flex-col gap-2">
            <p>© 2026 GRID.01 • AKHILESH KOTEGAR</p>
            <p className="text-white/50">WITH LOTS OF LOVE TO MY CO-DRIVER — DUBU</p>
          </div>

          {/* Legal Disclaimer Section */}
          <div className="max-w-3xl leading-relaxed normal-case tracking-widest text-[7px]">
            <p>
              This website is an unofficial, non-commercial fan project. F1, FORMULA ONE, FORMULA 1,
              FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trademarks of
              Formula One Licensing B.V. All rights reserved.
            </p>
            <p className="mt-2">
              Data provided by Jolpica/Ergast API & FastF1.
              Images and logos are property of their respective owners.
            </p>
          </div>

          {/* German Law Requirements */}
          <div className="flex gap-8 underline decoration-white/10 underline-offset-4">
            <a href="/impressum" className="hover:text-white/60 transition-colors">Impressum</a>
            <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </main>
  );
}