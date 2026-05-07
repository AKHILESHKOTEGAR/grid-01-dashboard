"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MapPin, Users, Zap, Trophy, ChevronRight, Globe } from "lucide-react";
import { TEAMS_2026, F1Team } from "@/libs/teams";
import { getFlagUrl, TeamLogoBadge } from "@/components/Podium";

/* ------------------------------------------------------------------ */
/*  STANDINGS FETCH                                                    */
/* ------------------------------------------------------------------ */
function useConstructorStandings(year = "2026") {
  const [standings, setStandings] = useState<Record<string, { points: string; position: string }>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`)
        .then(r => r.json())
        .then(data => {
          const lists = data?.MRData?.StandingsTable?.StandingsLists ?? [];
          const list = lists[lists.length - 1]?.ConstructorStandings ?? [];
          const map: Record<string, { points: string; position: string }> = {};
          list.forEach((s: any) => {
            map[s.Constructor.constructorId] = { points: s.points, position: s.position };
          });
          setStandings(map);
          setLastUpdated(new Date());
        })
        .catch(() => {});

    load();
    const interval = setInterval(load, 60 * 1000); // poll every 60 s
    return () => clearInterval(interval);
  }, [year]);

  return { standings, lastUpdated };
}

/* ------------------------------------------------------------------ */
/*  CARD                                                               */
/* ------------------------------------------------------------------ */
function TeamCard({ team, standing }: { team: F1Team; standing?: { points: string; position: string } }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/teams/${team.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className="relative rounded-[2.5rem] border overflow-hidden cursor-pointer h-full transition-all duration-300"
        style={{
          background: "var(--card)",
          borderColor: hovered ? `${team.color}55` : "var(--border)",
          boxShadow: hovered ? `0 20px 60px ${team.color}22, 0 0 0 1px ${team.color}33` : "none",
        }}
      >
        {/* Color glow */}
        <div
          className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-500"
          style={{ background: team.color, opacity: hovered ? 0.25 : 0.07 }}
        />
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: team.color }} />

        <div className="p-7 flex flex-col gap-5 relative z-10">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-4">
              {/* Team logo */}
              <TeamLogoBadge teamName={team.name} teamColor={team.color} size={64} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: team.color }}>
                    {team.engine} Power
                  </span>
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
                  {team.name}
                </h2>
                <p className="text-[10px] mt-0.5 font-medium truncate" style={{ color: "var(--text-3)" }}>
                  {team.fullName}
                </p>
              </div>
            </div>
            {standing && (
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl border shrink-0"
                style={{ background: `${team.color}15`, borderColor: `${team.color}40` }}>
                <span className="text-[8px] font-black uppercase" style={{ color: team.color }}>P{standing.position}</span>
                <span className="text-lg font-mono font-black" style={{ color: "var(--text)" }}>{standing.points}</span>
                <span className="text-[7px] font-bold uppercase" style={{ color: "var(--text-3)" }}>pts</span>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--text-2)" }}>
            {team.description}
          </p>

          {/* HQ */}
          <div className="flex items-center gap-2">
            <MapPin size={11} style={{ color: team.color }} />
            <span className="text-[11px] font-bold" style={{ color: "var(--text-2)" }}>
              {team.hq}, {team.country}
            </span>
          </div>

          {/* Chassis + Founded */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl p-3 border text-center" style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}>
              <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Chassis</div>
              <div className="text-sm font-black italic" style={{ color: "var(--text)" }}>{team.chassis}</div>
            </div>
            <div className="flex-1 rounded-xl p-3 border text-center" style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}>
              <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Est.</div>
              <div className="text-sm font-black italic" style={{ color: "var(--text)" }}>{team.founded}</div>
            </div>
            <div className="flex-1 rounded-xl p-3 border text-center" style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}>
              <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Titles</div>
              <div className="text-sm font-black italic" style={{ color: "var(--text)" }}>{team.championships.constructors}</div>
            </div>
          </div>

          {/* Drivers */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={10} style={{ color: "var(--text-3)" }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>2026 Drivers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.drivers.map(name => (
                <span key={name} className="px-3 py-1 rounded-full text-[10px] font-bold border"
                  style={{ background: `${team.color}15`, borderColor: `${team.color}40`, color: "var(--text)" }}>
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Personnel */}
          <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <Zap size={10} style={{ color: "var(--text-3)" }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Key Personnel</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {team.personnel.slice(0, 4).map(p => (
                <div key={p.role} className="rounded-xl p-2" style={{ background: "var(--card-hover)" }}>
                  <div className="text-[8px] font-black uppercase tracking-widest truncate" style={{ color: team.color }}>{p.role}</div>
                  <div className="text-[10px] font-bold truncate" style={{ color: "var(--text)" }}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Coords */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px]" style={{ color: "var(--text-4)" }}>{team.coords}</span>
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ color: hovered ? team.color : "var(--text-3)" }}>
              Dossier <ChevronRight size={11} />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function PaddockPage() {
  const { standings, lastUpdated } = useConstructorStandings("2026");
  const [filter, setFilter] = useState<"all" | "gb" | "it" | "us" | "ch">("all");

  const filtered = filter === "all" ? TEAMS_2026 : TEAMS_2026.filter(t => t.countryCode === filter);

  return (
    <div className="min-h-screen pt-24 pb-20 px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto">

        {/* PAGE HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="h-px w-10 bg-red-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-red-600">
              Unified Paddock Registry // 2026 Season
            </span>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h1 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
              The Paddock
            </h1>
            {lastUpdated && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest mb-1"
                style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.2)", color: "#22c55e" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live · {lastUpdated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          <p className="mt-3 text-sm max-w-lg" style={{ color: "var(--text-2)" }}>
            All 11 constructors. Key personnel, HQ intelligence, 2026 standings — updated live.
          </p>

          {/* Filter bar */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {[
              { key: "all", label: "All Teams" },
              { key: "gb",  label: "🇬🇧 UK Base" },
              { key: "it",  label: "🇮🇹 Italy" },
              { key: "us",  label: "🇺🇸 USA" },
              { key: "ch",  label: "🇨🇭 Switzerland" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all"
                style={{
                  background: filter === f.key ? "#E10600" : "var(--card)",
                  borderColor: filter === f.key ? "#E10600" : "var(--border)",
                  color: filter === f.key ? "#fff" : "var(--text-2)",
                  boxShadow: filter === f.key ? "0 0 16px rgba(225,6,0,0.4)" : "none",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.header>

        {/* STATS ROW */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: "Constructors",    value: "11",   icon: <Trophy size={14} /> },
            { label: "Nationalities",   value: "5",    icon: <Globe size={14} /> },
            { label: "Engine Suppliers",value: "5",    icon: <Zap size={14} /> },
            { label: "HQ Countries",    value: "4",    icon: <MapPin size={14} /> },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 border flex items-center gap-3"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div style={{ color: "#E10600" }}>{s.icon}</div>
              <div>
                <div className="text-2xl font-black italic" style={{ color: "var(--text)" }}>{s.value}</div>
                <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* GRID */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filtered.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <TeamCard
                  team={team}
                  standing={standings[team.constructorId]}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
