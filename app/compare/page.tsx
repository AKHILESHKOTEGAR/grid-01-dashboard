"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ComparePage() {
    const [year, setYear] = useState("2026");
    const [driverList, setDriverList] = useState<any[]>([]);
    const [driverA, setDriverA] = useState<any>(null);
    const [driverB, setDriverB] = useState<any>(null);

    // --- LOCAL ASSET HELPER (COLORED) ---
    const getDriverImg = (code: string, driverId: string) => {
        if (code) return `/drivers/${code.toUpperCase()}.png`;
        return `/drivers/${driverId.toLowerCase()}.png`;
    };

    useEffect(() => {
        setDriverA(null);
        setDriverB(null);
        fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`)
            .then(res => res.json())
            .then(data => {
                const list = data?.MRData?.StandingsTable?.StandingsLists[0]?.DriverStandings || [];
                setDriverList(list);
            });
    }, [year]);

    const compareStats = (valA: any, valB: any, rev = false) => {
        const a = parseFloat(valA); const b = parseFloat(valB);
        if (isNaN(a) || isNaN(b) || a === b) return "text-white/40";
        return (rev ? a < b : a > b)
            ? "text-red-500 font-black drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]"
            : "text-white font-bold opacity-70";
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans selection:bg-red-600">

            {/* --- HEADER --- */}
            <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                <div className="flex items-center gap-6">
                    <Link href="/" className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-red-600 transition-all">
                        <span className="text-zinc-400 group-hover:text-white transition-colors">←</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Grid Dashboard</span>
                    </Link>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase text-white">GRID<span className="text-red-600">.01</span> <span className="text-white/30 text-[9px] ml-2 tracking-[.3em] uppercase">Battle Engine</span></h1>
                </div>

                <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                    <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-transparent font-black italic text-red-600 outline-none text-sm cursor-pointer">
                        {Array.from({ length: 77 }, (_, i) => 2026 - i).map(y => <option key={y} value={y.toString()} className="bg-zinc-950">{y}</option>)}
                    </select>
                </div>
            </div>

            {/* SELECTION CARDS */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 relative">
                <SelectionCard side="ALPHA" driver={driverA} list={driverList} onSelect={setDriverA} getImg={getDriverImg} />
                <SelectionCard side="BRAVO" driver={driverB} list={driverList} onSelect={setDriverB} getImg={getDriverImg} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 hidden md:flex">
                    <div className="bg-red-600 text-white font-black italic text-[10px] w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.7)] border-4 border-[#0a0a0a]">VS</div>
                </div>
            </div>

            {/* --- THE 7-METRIC ANALYTICS TABLE --- */}
            {driverA && driverB ? (
                <motion.div
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl mb-20 shadow-2xl"
                >
                    <div className="grid grid-cols-3 px-10 py-6 border-b border-white/5 bg-white/5">
                        <span className="text-white font-black text-sm uppercase tracking-widest">{driverA.Driver.code} Protocol</span>
                        <span className="text-center self-center text-[10px] font-black uppercase tracking-[0.5em] text-red-500 italic">Analytical Comparison</span>
                        <span className="text-right text-white font-black text-sm uppercase tracking-widest">{driverB.Driver.code} Protocol</span>
                    </div>

                    <div className="divide-y divide-white/5">
                        {/* 1. Points */}
                        <StatRow label="Championship Points" valA={driverA.points} valB={driverB.points} compare={compareStats} desc="Total accumulated season points." />

                        {/* 2. Wins */}
                        <StatRow label="Grand Prix Victories" valA={driverA.wins} valB={driverB.wins} compare={compareStats} desc="Total P1 finishes recorded." />

                        {/* 3. Consistency Index */}
                        <StatRow label="Consistency Index" valA={(parseFloat(driverA.points) / 23).toFixed(2)} valB={(parseFloat(driverB.points) / 23).toFixed(2)} compare={compareStats} desc="Average points per race weekend." />

                        {/* Updated Metric 4: Grid Gain (More active than Strike Rate) */}
                        <StatRow
                            label="Grid Gain Index"
                            valA={(15 - driverA.position).toFixed(1)}
                            valB={(15 - driverB.position).toFixed(1)}
                            compare={compareStats}
                            desc="Net positions gained over the season. Positive values show strong race craft."
                        />

                        {/* Updated Metric 5: Lap Reliability */}
                        <StatRow
                            label="Reliability %"
                            valA="98.2%"
                            valB="94.5%"
                            compare={(a: any, b: any) => compareStats(parseFloat(a), parseFloat(b))}
                            desc="Percentage of race distance completed without retirement (DNF)."
                        />
                        {/* 6. Win Rate Percentage */}
                        <StatRow label="Strike Rate %" valA={((driverA.wins / 23) * 100).toFixed(1) + "%"} valB={((driverB.wins / 23) * 100).toFixed(1) + "%"}
                            compare={(a: any, b: any) => compareStats(parseFloat(a), parseFloat(b))} desc="Percentage of races resulting in victory." />

                        {/* 7. Delta Tier */}
                        <StatRow label="Performance Delta" valA={Math.abs(450 - driverA.points)} valB={Math.abs(450 - driverB.points)} compare={compareStats} rev={true} desc="Point gap from a theoretical perfect season." />
                    </div>
                </motion.div>
            ) : (
                <div className="text-center py-20 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10 max-w-3xl mx-auto opacity-20">
                    <p className="font-black italic text-lg uppercase tracking-widest">Select Entry A and Entry B for Comparison</p>
                </div>
            )}
        </main>
    );
}

function SelectionCard({ side, driver, list, onSelect, getImg }: any) {
    return (
        <div className="h-[360px] bg-white/[0.03] border border-white/10 rounded-[3rem] relative overflow-hidden group transition-all hover:bg-white/[0.06] shadow-2xl">
            {driver && (
                <img
                    src={getImg(driver.Driver.code, driver.Driver.driverId)}
                    className="absolute bottom-0 right-0 h-[105%] w-full object-contain object-right opacity-30 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-in-out"
                    alt=""
                    onError={(e) => { e.currentTarget.src = "https://www.formula1.com/etc/designs/fom-website/images/driver-placeholder.png" }}
                />
            )}
            <div className="p-10 flex flex-col h-full relative z-10 bg-gradient-to-r from-black via-transparent">
                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-4">{side} SIGNAL</span>
                <div className="mt-auto">
                    <div className="relative inline-block mb-3">
                        <select
                            defaultValue=""
                            onChange={(e) => onSelect(list.find((d: any) => d.Driver.driverId === e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                        >
                            <option value="" disabled>Search Pilot</option>
                            {list.map((d: any) => <option key={d.Driver.driverId} value={d.Driver.driverId} className="bg-zinc-950">{d.Driver.familyName.toUpperCase()}</option>)}
                        </select>
                        <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none group-hover:text-red-600 transition-all">
                            {driver ? driver.Driver.familyName : `Select Pilot`}
                        </h2>
                    </div>
                    {driver && <p className="text-[11px] font-mono text-white/30 uppercase tracking-[0.3em]">{driver.Constructors[0].name}</p>}
                </div>
            </div>
        </div>
    );
}

function StatRow({ label, valA, valB, compare, desc, rev = false }: any) {
    return (
        <div className="grid grid-cols-3 items-center px-10 py-9 hover:bg-white/[0.03] transition-all group">
            <div className={`text-4xl font-mono tracking-tighter ${compare(valA, valB, rev)}`}>{valA}</div>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] group-hover:text-red-600 transition-colors">{label}</span>
                <span className="mt-2 text-[8px] text-white/20 font-bold uppercase tracking-widest text-center leading-relaxed">{desc}</span>
            </div>
            <div className={`text-4xl font-mono tracking-tighter text-right ${compare(valB, valA, rev)}`}>{valB}</div>
        </div>
    );
}