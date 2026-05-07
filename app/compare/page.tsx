"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { getDriverPhoto, getFlagUrl, getConstructorColor } from "@/components/Podium";

export default function ComparePage() {
  const { isDark } = useTheme();
  const [year, setYear] = useState("2026");
  const [driverList, setDriverList] = useState<any[]>([]);
  const [driverA, setDriverA] = useState<any>(null);
  const [driverB, setDriverB] = useState<any>(null);

  useEffect(() => {
    setDriverA(null); setDriverB(null);
    fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`)
      .then(r => r.json())
      .then(d => setDriverList(d?.MRData?.StandingsTable?.StandingsLists[0]?.DriverStandings ?? []))
      .catch(() => {});
  }, [year]);

  const compareStats = (valA: any, valB: any, rev = false) => {
    const a = parseFloat(valA); const b = parseFloat(valB);
    if (isNaN(a) || isNaN(b) || a === b) return { winner: null };
    return { winner: (rev ? a < b : a > b) ? "A" : "B" };
  };

  return (
    <main className="min-h-screen pt-24 pb-20 px-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-10 bg-red-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-red-600">Driver Analysis Engine</span>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none" style={{ color: "var(--text)" }}>
              Labs Engine
            </h1>
            <div className="p-1.5 rounded-full border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="bg-transparent font-black italic text-red-600 outline-none text-sm cursor-pointer px-3"
              >
                {Array.from({ length: 77 }, (_, i) => 2026 - i).map(y => (
                  <option key={y} value={String(y)} style={{ background: isDark ? "#0a0a0a" : "#fff" }}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* SELECTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10 relative">
          <SelectionCard side="ALPHA" label="A" driver={driverA} list={driverList} onSelect={setDriverA} isDark={isDark} />
          <SelectionCard side="BRAVO" label="B" driver={driverB} list={driverList} onSelect={setDriverB} isDark={isDark} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 hidden md:flex">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-black italic text-[11px] text-white border-4 shadow-[0_0_30px_rgba(225,6,0,0.6)]"
              style={{ background: "#E10600", borderColor: "var(--bg)" }}>
              VS
            </div>
          </div>
        </div>

        {/* STATS TABLE */}
        {driverA && driverB ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] border overflow-hidden shadow-2xl"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Table header */}
            <div className="grid grid-cols-3 px-8 py-5 border-b" style={{ borderColor: "var(--border)", background: "var(--card-hover)" }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full" style={{ background: getConstructorColor(driverA.Constructors?.[0]?.name ?? "") }} />
                <span className="font-black text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>
                  {driverA.Driver.code}
                </span>
              </div>
              <span className="text-center self-center text-[10px] font-black uppercase tracking-[0.5em] text-red-500 italic">
                Head-to-Head
              </span>
              <div className="flex items-center justify-end gap-3">
                <span className="font-black text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>
                  {driverB.Driver.code}
                </span>
                <div className="w-2 h-8 rounded-full" style={{ background: getConstructorColor(driverB.Constructors?.[0]?.name ?? "") }} />
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              <StatRow
                label="Championship Points" desc="Total accumulated season points."
                valA={driverA.points} valB={driverB.points}
                result={compareStats(driverA.points, driverB.points)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
              <StatRow
                label="Grand Prix Victories" desc="Total P1 finishes recorded."
                valA={driverA.wins} valB={driverB.wins}
                result={compareStats(driverA.wins, driverB.wins)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
              <StatRow
                label="Consistency Index" desc="Average points per race weekend."
                valA={(parseFloat(driverA.points) / 23).toFixed(2)}
                valB={(parseFloat(driverB.points) / 23).toFixed(2)}
                result={compareStats(parseFloat(driverA.points) / 23, parseFloat(driverB.points) / 23)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
              <StatRow
                label="Grid Gain Index" desc="Net positions gained vs. starting grid position."
                valA={(15 - driverA.position).toFixed(1)}
                valB={(15 - driverB.position).toFixed(1)}
                result={compareStats(15 - driverA.position, 15 - driverB.position)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
              <StatRow
                label="Strike Rate %" desc="Percentage of races resulting in victory."
                valA={((driverA.wins / 23) * 100).toFixed(1) + "%"}
                valB={((driverB.wins / 23) * 100).toFixed(1) + "%"}
                result={compareStats((driverA.wins / 23) * 100, (driverB.wins / 23) * 100)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
              <StatRow
                label="Championship Position" desc="Current standing in the World Championship."
                valA={driverA.position} valB={driverB.position}
                result={compareStats(driverA.position, driverB.position, true)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
              <StatRow
                label="Performance Delta" desc="Point gap from a theoretical perfect season (450 pts)."
                valA={Math.abs(450 - parseFloat(driverA.points))}
                valB={Math.abs(450 - parseFloat(driverB.points))}
                result={compareStats(Math.abs(450 - parseFloat(driverA.points)), Math.abs(450 - parseFloat(driverB.points)), true)}
                colorA={getConstructorColor(driverA.Constructors?.[0]?.name ?? "")}
                colorB={getConstructorColor(driverB.Constructors?.[0]?.name ?? "")}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 rounded-[3rem] border border-dashed"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="font-black italic text-base uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
              Select Entry A and Entry B for Comparison
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}

/* ---- Selection Card ---- */
function SelectionCard({ side, label, driver, list, onSelect, isDark }: any) {
  const accentColor = driver ? getConstructorColor(driver.Constructors?.[0]?.name ?? "") : "#E10600";
  return (
    <div
      className="h-[320px] rounded-[2.5rem] border relative overflow-hidden group transition-all"
      style={{
        background: "var(--card)",
        borderColor: driver ? `${accentColor}55` : "var(--border)",
        boxShadow: driver ? `0 0 40px ${accentColor}18` : "none",
      }}
    >
      {/* Driver photo */}
      {driver && (
        <img
          src={getDriverPhoto(driver.Driver.driverId, driver.Driver.code)}
          className="absolute bottom-0 right-0 h-[115%] w-full object-contain object-right-bottom opacity-55 group-hover:opacity-90 transition-all duration-700 ease-out scale-100 group-hover:scale-105"
          alt=""
          onError={(e) => {
            const t = e.currentTarget;
            const flag = getFlagUrl(driver.Driver.nationality);
            if (t.src !== flag) { t.src = flag; t.className = "absolute bottom-0 right-0 h-[60%] w-[60%] object-contain opacity-30 group-hover:opacity-50 transition-all"; }
          }}
        />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/60 to-transparent pointer-events-none" />

      <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
        <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em]">{side} SIGNAL</span>
        <div>
          {/* Invisible native select overlay */}
          <div className="relative inline-block mb-2 w-full">
            <select
              onChange={e => onSelect(list.find((d: any) => d.Driver.driverId === e.target.value))}
              defaultValue=""
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            >
              <option value="" disabled>Select Driver</option>
              {list.map((d: any) => (
                <option key={d.Driver.driverId} value={d.Driver.driverId}
                  style={{ background: isDark ? "#0a0a0a" : "#fff" }}>
                  {d.Driver.familyName.toUpperCase()} ({d.Driver.code})
                </option>
              ))}
            </select>
            <h2
              className="text-5xl font-black italic uppercase tracking-tighter leading-none transition-colors"
              style={{ color: driver ? "var(--text)" : "var(--text-4)" }}
            >
              {driver ? driver.Driver.familyName : `Select ${label}`}
            </h2>
          </div>
          {driver && (
            <p className="text-[11px] font-mono uppercase tracking-[0.3em]" style={{ color: "var(--text-3)" }}>
              {driver.Constructors?.[0]?.name} • P{driver.position} • {driver.points}pts
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Stat Row ---- */
function StatRow({ label, desc, valA, valB, result, colorA, colorB }: any) {
  const aWins = result.winner === "A";
  const bWins = result.winner === "B";
  const numA = parseFloat(String(valA).replace("%", "")) || 0;
  const numB = parseFloat(String(valB).replace("%", "")) || 0;
  const maxVal = Math.max(Math.abs(numA), Math.abs(numB)) || 1;
  const barA = Math.min(100, (Math.abs(numA) / maxVal) * 100);
  const barB = Math.min(100, (Math.abs(numB) / maxVal) * 100);

  return (
    <div className="grid grid-cols-3 items-center px-8 py-6 transition-all group"
      style={{ background: "transparent" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--card-hover)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Driver A */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-mono font-black tracking-tighter" style={{ color: aWins ? colorA : "var(--text-3)" }}>
            {valA}
          </span>
          {aWins && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs font-black" style={{ color: colorA }}>▲</motion.span>
          )}
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${barA}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            style={{ background: aWins ? colorA : "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* Center label */}
      <div className="flex flex-col items-center gap-1 px-4">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-center transition-colors group-hover:text-red-500"
          style={{ color: "var(--text-3)" }}>
          {label}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-center leading-relaxed" style={{ color: "var(--text-4)" }}>
          {desc}
        </span>
      </div>

      {/* Driver B */}
      <div className="flex flex-col gap-1.5 items-end">
        <div className="flex items-baseline gap-1.5 justify-end">
          {bWins && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs font-black" style={{ color: colorB }}>▲</motion.span>
          )}
          <span className="text-3xl font-mono font-black tracking-tighter" style={{ color: bWins ? colorB : "var(--text-3)" }}>
            {valB}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden w-full" style={{ background: "var(--border)" }}>
          <motion.div className="h-full rounded-full ml-auto"
            initial={{ width: 0 }}
            animate={{ width: `${barB}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            style={{ background: bWins ? colorB : "rgba(255,255,255,0.15)", marginLeft: `${100 - barB}%` }} />
        </div>
      </div>
    </div>
  );
}
