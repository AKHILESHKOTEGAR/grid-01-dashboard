"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Zap, Trophy, Users, ArrowLeft, Globe, Calendar, Car } from "lucide-react";
import { getTeamById } from "@/libs/teams";
import { getConstructorColor, getFlagUrl, TeamLogoBadge } from "@/components/Podium";

/* ------------------------------------------------------------------ */
/*  DRIVER NAME → CODE MAP                                             */
/* ------------------------------------------------------------------ */
const DRIVER_MAP: Record<string, { code: string; nationality: string }> = {
  "Lando Norris": { code: "NOR", nationality: "British" },
  "Oscar Piastri": { code: "PIA", nationality: "Australian" },
  "George Russell": { code: "RUS", nationality: "British" },
  "Kimi Antonelli": { code: "ANT", nationality: "Italian" },
  "Max Verstappen": { code: "VER", nationality: "Dutch" },
  "Liam Lawson": { code: "LAW", nationality: "New Zealander" },
  "Charles Leclerc": { code: "LEC", nationality: "Monegasque" },
  "Lewis Hamilton": { code: "HAM", nationality: "British" },
  "Fernando Alonso": { code: "ALO", nationality: "Spanish" },
  "Lance Stroll": { code: "STR", nationality: "Canadian" },
  "Pierre Gasly": { code: "GAS", nationality: "French" },
  "Jack Doohan": { code: "DOO", nationality: "Australian" },
  "Carlos Sainz": { code: "SAI", nationality: "Spanish" },
  "Alexander Albon": { code: "ALB", nationality: "Thai" },
  "Yuki Tsunoda": { code: "TSU", nationality: "Japanese" },
  "Isack Hadjar": { code: "HAD", nationality: "French" },
  "Oliver Bearman": { code: "BEA", nationality: "British" },
  "Esteban Ocon": { code: "OCO", nationality: "French" },
  "Nico Hülkenberg": { code: "HUL", nationality: "German" },
  "Gabriel Bortoleto": { code: "BOR", nationality: "Brazilian" },
  "Sergio Pérez": { code: "PER", nationality: "Mexican" },
  "Valtteri Bottas": { code: "BOT", nationality: "Finnish" },
  "Zhou Guanyu": { code: "ZHO", nationality: "Chinese" },
  "Alex Albon": { code: "ALB", nationality: "Thai" },
  "Arvid Lindblad": { code: "LIN", nationality: "Dutch" },
  "Franco Colapinto": { code: "COL", nationality: "Argentine" },
};

/* ------------------------------------------------------------------ */
/*  FETCH LIVE STATS                                                   */
/* ------------------------------------------------------------------ */
async function fetchTeamStats(constructorId: string, year = "2026") {
  const res = await fetch(
    `https://api.jolpi.ca/ergast/f1/${year}/constructors/${constructorId}/constructorStandings.json`
  );
  const json = await res.json();
  return json?.MRData?.StandingsTable?.StandingsLists[0]?.ConstructorStandings[0] ?? null;
}

async function fetchRecentResults(constructorId: string, year = "2026") {
  // limit=100 covers a full season; sort descending so latest race is first
  const res = await fetch(
    `https://api.jolpi.ca/ergast/f1/${year}/constructors/${constructorId}/results.json?limit=100`
  );
  const json = await res.json();
  const races: any[] = json?.MRData?.RaceTable?.Races ?? [];
  // Return most-recent first
  return [...races].sort((a, b) => Number(b.round) - Number(a.round));
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function TeamDossier() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const team = getTeamById(id as string);
  const [stats, setStats] = useState<any>(null);
  const [recentRaces, setRecentRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) return;
    setLoading(true);
    Promise.allSettled([
      fetchTeamStats(team.constructorId),
      fetchRecentResults(team.constructorId),
    ]).then(([statsResult, racesResult]) => {
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (racesResult.status === "fulfilled") setRecentRaces(racesResult.value);
    }).finally(() => setLoading(false));
  }, [team]);

  /* ---- 404 fallback ---- */
  if (!team) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-6" style={{ background: "var(--bg)" }}>
        <p className="text-red-600 font-black italic text-2xl uppercase">Team Not Found</p>
        <Link href="/paddock" className="px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
          ← Return to Paddock
        </Link>
      </div>
    );
  }

  const accent = team.color;

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-6xl mx-auto space-y-6 mt-8">
          <div className="h-40 rounded-[2.5rem] skeleton" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)}
          </div>
          <div className="h-64 rounded-[2.5rem] skeleton" />
        </div>
      </div>
    );
  }

  /* ---- Main render ---- */
  return (
    <div className="min-h-screen pt-24 pb-24 px-6 overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ---- BACK NAV ---- */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            href="/paddock"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            <ArrowLeft size={11} /> Paddock
          </Link>
        </motion.div>

        {/* ---- HERO BANNER ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-[2.5rem] border overflow-hidden"
          style={{ borderColor: `${accent}33`, background: "var(--card)" }}
        >
          {/* Gradient bg */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 70% 50%, ${accent}, transparent 70%)` }}
          />
          {/* Top bar */}
          <div className="h-1.5" style={{ background: accent }} />

          <div className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Logo */}
            <TeamLogoBadge teamName={team.name} teamColor={accent} size={112} />

            {/* Info */}
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] mb-2" style={{ color: accent }}>
                {team.engine} Power Unit • Est. {team.founded}
              </div>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
                {team.name}
              </h1>
              <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-3)" }}>{team.fullName}</p>
              <p className="text-sm mt-3 max-w-xl" style={{ color: "var(--text-2)" }}>{team.description}</p>
            </div>

            {/* Live stats */}
            {stats && (
              <div className="flex flex-col items-center gap-1 border rounded-2xl px-8 py-5 shrink-0"
                style={{ borderColor: `${accent}40`, background: `${accent}10` }}>
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: accent }}>2026 Position</span>
                <span className="text-5xl font-mono font-black italic" style={{ color: accent }}>P{stats.position}</span>
                <span className="text-2xl font-black" style={{ color: "var(--text)" }}>{stats.points}</span>
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Points</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ---- KEY STATS ---- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { icon: <Trophy size={16} />, label: "Constructors' Titles", value: team.championships.constructors },
            { icon: <Trophy size={16} />, label: "Drivers' Titles", value: team.championships.drivers },
            { icon: <Car size={16} />, label: "Chassis", value: team.chassis },
            { icon: <Calendar size={16} />, label: "Founded", value: team.founded },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5 border flex flex-col gap-2"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div style={{ color: accent }}>{s.icon}</div>
              <div className="text-2xl font-black italic" style={{ color: "var(--text)" }}>{s.value}</div>
              <div className="text-[9px] font-black uppercase tracking-widest leading-snug" style={{ color: "var(--text-3)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* ---- MAIN GRID: HQ + Personnel ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* HQ INTELLIGENCE */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-[2.5rem] border overflow-hidden"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Styled HQ visual */}
            <div className="relative h-36 overflow-hidden flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accent}30 0%, ${accent}08 100%)` }}>
              {/* Dot grid */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle, ${accent}60 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }} />
              {/* Compass */}
              <div className="relative flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: `${accent}60`, background: `${accent}15` }}>
                  <MapPin size={24} style={{ color: accent }} />
                </div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                  {team.coords}
                </div>
              </div>
            </div>

            <div className="p-7 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={13} style={{ color: accent }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Headquarters</span>
              </div>

              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tight" style={{ color: "var(--text)" }}>
                  {team.hq}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>{team.country}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl p-3 border" style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}>
                  <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Power Unit</div>
                  <div className="text-sm font-black italic" style={{ color: "var(--text)" }}>{team.engine}</div>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}>
                  <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Website</div>
                  <div className="text-[11px] font-bold truncate" style={{ color: accent }}>{team.website}</div>
                </div>
              </div>

              {/* 2026 Drivers */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={11} style={{ color: "var(--text-3)" }} />
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>2026 Driver Lineup</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {team.drivers.map(name => {
                    const info = DRIVER_MAP[name];
                    const code = info?.code ?? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3);
                    const nat = info?.nationality ?? "";
                    return (
                      <div key={name}
                        className="relative flex items-center gap-3 p-3 rounded-2xl border overflow-hidden"
                        style={{ background: `${accent}10`, borderColor: `${accent}35` }}>
                        {/* Glow */}
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                          style={{ background: accent, opacity: 0.15 }} />
                        {/* Photo */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden border shrink-0"
                          style={{ borderColor: `${accent}40`, background: "var(--card-hover)" }}>
                          <img
                            src={`/drivers/${code}.png`}
                            alt={name}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              const t = e.currentTarget;
                              const flag = getFlagUrl(nat);
                              if (t.src !== flag) { t.src = flag; t.style.transform = "scale(1.6)"; t.style.objectFit = "cover"; }
                            }}
                          />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>{code}</div>
                          <div className="text-[11px] font-black leading-tight mt-0.5" style={{ color: "var(--text)" }}>
                            {name.split(" ").map((w, i) => (
                              <span key={i} className={i === 0 ? "opacity-60" : ""}>{w}{i < name.split(" ").length - 1 ? " " : ""}</span>
                            ))}
                          </div>
                          {nat && (
                            <div className="text-[8px] font-bold uppercase tracking-widest mt-0.5 truncate" style={{ color: "var(--text-4)" }}>{nat}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* PERSONNEL */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-[2.5rem] border p-7 space-y-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users size={13} style={{ color: accent }} />
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Engineering Command</span>
            </div>

            <h3 className="text-2xl font-black italic uppercase tracking-tight" style={{ color: "var(--text)" }}>
              Key Personnel
            </h3>

            <div className="space-y-2 pt-1">
              {team.personnel.map((p, i) => (
                <motion.div
                  key={p.role}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center justify-between rounded-2xl p-4 border group transition-all hover:scale-[1.01]"
                  style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}
                  whileHover={{ borderColor: `${accent}50` }}
                >
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: accent }}>
                      {p.role}
                    </div>
                    <div className="text-base font-black italic mt-0.5" style={{ color: "var(--text)" }}>
                      {p.name}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black"
                    style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}>
                    {p.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ---- RECENT RESULTS ---- */}
        {recentRaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-[2.5rem] border p-8"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Zap size={13} style={{ color: accent }} />
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                Recent Race Performance — 2026 · Latest First
              </span>
            </div>
            <div className="space-y-3">
              {recentRaces.slice(0, 5).map((race: any) => {
                const r1 = race.Results?.[0];
                const r2 = race.Results?.[1];
                return (
                  <div key={race.round} className="flex items-center gap-4 p-4 rounded-2xl border"
                    style={{ background: "var(--card-hover)", borderColor: "var(--border)" }}>
                    <span className="text-[10px] font-mono font-black w-5 shrink-0" style={{ color: "var(--text-3)" }}>R{race.round}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black uppercase truncate" style={{ color: "var(--text)" }}>{race.raceName}</div>
                      <div className="text-[9px]" style={{ color: "var(--text-3)" }}>{race.Circuit?.Location?.country}</div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      {r1 && (
                        <div className="text-center">
                          <div className="text-[8px] font-black uppercase" style={{ color: "var(--text-3)" }}>P{r1.position}</div>
                          <div className="text-[11px] font-black" style={{ color: "var(--text)" }}>{r1.Driver?.code}</div>
                          <div className="text-[9px] font-bold text-red-600">{r1.points}pts</div>
                        </div>
                      )}
                      {r2 && (
                        <div className="text-center">
                          <div className="text-[8px] font-black uppercase" style={{ color: "var(--text-3)" }}>P{r2.position}</div>
                          <div className="text-[11px] font-black" style={{ color: "var(--text)" }}>{r2.Driver?.code}</div>
                          <div className="text-[9px] font-bold text-red-600">{r2.points}pts</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
