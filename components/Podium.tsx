"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  NATIONALITY → ISO CODE                                             */
/* ------------------------------------------------------------------ */
const nationalityToCode: Record<string, string> = {
  Argentine: "ar", Italian: "it", British: "gb", French: "fr",
  German: "de", American: "us", Brazilian: "br", Spanish: "es",
  Austrian: "at", Australian: "au", Finnish: "fi", Dutch: "nl",
  Belgian: "be", Swiss: "ch", Mexican: "mx", Monaco: "mc", Monegasque: "mc",
  Japanese: "jp", Indian: "in", Canadian: "ca", Swedish: "se", Rhodesian: "zw",
  Danish: "dk", Thai: "th", Chinese: "cn", Polish: "pl",
  Colombian: "co", Portuguese: "pt", Russian: "ru", "South Korean": "kr",
  Turkish: "tr", Venezuelan: "ve", Irish: "ie", Chilean: "cl",
  "New Zealander": "nz", "South African": "za", Malaysian: "my", Hungarian: "hu",
};

/* ------------------------------------------------------------------ */
/*  CIRCUIT ID MAP                                                     */
/* ------------------------------------------------------------------ */
const circuitIdMap: Record<string, string> = {
  albert_park: "melbourne", losail: "lusail", ricard: "paul-ricard",
  catalunya: "catalunya", interlagos: "interlagos", villeneuve: "montreal",
  rodriguez: "mexico-city", red_bull_ring: "spielberg",
  spa: "spa-francorchamps", americas: "austin", yas_marina: "yas-marina",
  marina_bay: "marina-bay", galvez: "buenos-aires", kyalami: "kyalami",
  hockenheimring: "hockenheimring", hungaroring: "hungaroring",
  monaco: "monaco", monza: "monza", silverstone: "silverstone",
  suzuka: "suzuka", zandvoort: "zandvoort", jeddah: "jeddah",
  baku: "baku", shanghai: "shanghai", vegas: "las-vegas",
  caesars_palace: "caesars-palace", miami: "miami", bahrain: "bahrain",
};

/* ------------------------------------------------------------------ */
/*  CONSTRUCTOR COLOR ENGINE                                           */
/* ------------------------------------------------------------------ */
const CONSTRUCTOR_COLORS: Record<string, string> = {
  // 2026 active — synced with libs/teams.ts
  mclaren: "#FF8000",
  mercedes: "#48C4B1",
  ferrari: "#E8002D",
  "red bull": "#000044",
  "aston martin": "#229971",
  alpine: "#0093CC",
  williams: "#0545D9",
  haas: "#B6BABD",
  "racing bulls": "#3367EA",
  rb: "#3367EA",
  audi: "#C00F0C",
  sauber: "#52E252",
  cadillac: "#B8960C",
  // Legacy / historical
  alphatauri: "#2B4562", toro_rosso: "#C72626",
  "force india": "#F596C8", "racing point": "#F596C8",
  "alpha romeo": "#C92D4B", "alfa romeo": "#C92D4B",
  renault: "#FFD700", "brawn gp": "#CCFF00", brawn: "#CCFF00",
  toyota: "#E21B23", "bmw sauber": "#12439C",
  lotus: "#FFB800", benetton: "#008860", tyrrell: "#001DFF",
  brabham: "#002344", jordan: "#FFD700", jaguar: "#004225",
  bmw: "#FFFFFF",
};

export const getConstructorColor = (name: string): string => {
  const n = name?.toLowerCase() ?? "";
  const key = Object.keys(CONSTRUCTOR_COLORS).find(k => n.includes(k));
  if (key) return CONSTRUCTOR_COLORS[key];
  // deterministic color from name string
  let h = 0;
  for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return "#" + (h & 0x00ffffff).toString(16).padStart(6, "0").toUpperCase();
};

/* ------------------------------------------------------------------ */
/*  ASSET HELPERS                                                      */
/* ------------------------------------------------------------------ */
export const getFlagUrl = (nationality: string) => {
  const code = nationalityToCode[nationality] ?? "un";
  return `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code.toUpperCase()}.svg`;
};

export const getDriverPhoto = (driverId: string, code?: string) =>
  code ? `/drivers/${code.toUpperCase()}.png` : `/drivers/${driverId?.toLowerCase()}.png`;

export const getLogoPath = (name: string): string => {
  if (!name) return "";
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    // 2026 active constructors — actual filenames in public/teams/grid/
    "red bull": "/teams/grid/Red_Bull_Racing_-_2021_Logo.svg",
    ferrari: "/teams/grid/ferrari.svg",
    mercedes: "/teams/grid/Mercedes-Benz_in_Formula_One_logo.svg",
    mclaren: "/teams/grid/Mclaren_Logo_2021.svg",
    "aston martin": "/teams/grid/aston-martin-f1-2.svg",
    alpine: "/teams/grid/Alpine_F1_Team_Logo.svg",
    williams: "/teams/grid/williams-racing.svg",
    haas: "/teams/grid/TGR_Haas_F1_Team.svg",
    "racing bulls": "/teams/grid/Visa_Cash_App_RB_F1_Team.svg",
    alphatauri: "/teams/grid/Visa_Cash_App_RB_F1_Team.svg",
    "visa cash": "/teams/grid/Visa_Cash_App_RB_F1_Team.svg",
    "rb f1 team": "/teams/grid/Visa_Cash_App_RB_F1_Team.svg",
    audi: "/teams/grid/Audif1.com_logo17.svg",
    sauber: "/teams/grid/2023_Stake_F1_Team_Kick_Sauber_logo.png",
    kick: "/teams/grid/2023_Stake_F1_Team_Kick_Sauber_logo.png",
    cadillac: "/teams/grid/cadillac.svg",
    // Legacy
    "alfa romeo": "/teams/grid/alfa-romeo-4.svg",
    renault: "/teams/grid/Renault_F1_Team_logo_2019.png",
    toyota: "/teams/grid/toyota-f1 (1).svg",
    arrows: "/teams/grid/arrows-f1%20(1).svg",
    jordan: "/teams/grid/b-h-jordan%20(1).svg",
    jaguar: "/teams/grid/jaguar-racing%20(1).svg",
    lotus: "/teams/grid/lotus-f1-team-logo%20(1).svg",
    "force india": "/teams/grid/logo-force-india-f1-team-2011%20(1).svg",
  };
  const key = Object.keys(map).find(k => n.includes(k));
  return key ? map[key] : "";
};

/* ------------------------------------------------------------------ */
/*  TEAM LOGO BADGE                                                    */
/* ------------------------------------------------------------------ */
// These logos have white/opaque backgrounds — render them naturally on white
const NATURAL_COLOR_LOGOS = new Set([
  "/teams/grid/ferrari.svg",
  "/teams/grid/cadillac.svg",
]);

export function TeamLogoBadge({
  teamName,
  teamColor,
  size = 64,
  imgSize,
  className = "",
}: {
  teamName: string;
  teamColor: string;
  size?: number;
  imgSize?: number;
  className?: string;
}) {
  const path = getLogoPath(teamName);
  const natural = !!path && NATURAL_COLOR_LOGOS.has(path);
  const iSz = imgSize ?? Math.round(size * 0.68);
  const radius = Math.round(size * 0.28);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: natural ? "#ffffff" : teamColor,
        border: natural ? `2px solid ${teamColor}50` : "none",
        boxShadow: natural
          ? `0 4px 20px ${teamColor}28, 0 0 0 1px rgba(0,0,0,0.06)`
          : `0 0 20px ${teamColor}66, 0 0 0 1px ${teamColor}33`,
      }}
    >
      {path ? (
        <img
          src={path}
          className="object-contain"
          style={{ width: iSz, height: iSz, filter: natural ? "none" : "brightness(0) invert(1)" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <span
          className="font-black italic uppercase"
          style={{ fontSize: Math.round(size * 0.14), color: natural ? teamColor : "#ffffff" }}
        >
          {teamName.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CIRCUIT DISPLAY                                                    */
/* ------------------------------------------------------------------ */
export const CircuitDisplay = ({ circuitId, year }: { circuitId: string; year: string }) => {
  const fileName = circuitIdMap[circuitId] ?? circuitId;
  const isLive = year === "2026";

  return (
    <div className="relative w-full max-w-[320px] h-48 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 flex items-center justify-center overflow-hidden transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] hover:border-red-500/50 border border-white/20"
      style={{ background: "var(--card)", backdropFilter: "blur(40px)" }}>
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      {/* Scanline */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent h-24 w-full animate-scanline ${isLive ? "via-red-500/20" : "via-white/10"} to-transparent`} />
      </div>

      <img
        src={`/circuits/${fileName}-1.svg`}
        alt="Circuit"
        className="circuit-svg max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] scale-110 group-hover:scale-125 transition-transform duration-1000"
        onError={(e) => { (e.target as HTMLImageElement).src = `/circuits/${fileName}.svg`; }}
      />

      <div className="absolute bottom-5 left-8 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${isLive ? "bg-red-500 shadow-red-500/50" : "bg-white shadow-white/50"}`} />
        <div className="flex flex-col text-left">
          <span className={`text-[9px] font-black uppercase tracking-[0.4em] leading-none ${isLive ? "text-red-500" : "text-white"}`}>
            {isLive ? "Uplink: Live 2026" : `Archive ${year}`}
          </span>
          <span className="text-[6px] font-bold text-white/40 uppercase tracking-[0.2em] mt-0.5">
            {isLive ? "Strategic Scouting Mode" : "Historical Geometry Verified"}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  PODIUM CARD                                                        */
/* ------------------------------------------------------------------ */
export const PodiumCard = ({ driver, position }: { driver: any; position: number }) => {
  if (!driver) return null;
  const isWinner = position === 1;
  const d = driver.Driver ?? driver;
  const constructor = driver.Constructor?.name ?? "Independent";

  return (
    <motion.div
      whileHover={{ y: -12, scale: 1.04 }}
      className={`relative overflow-hidden rounded-[2.5rem] border bg-zinc-900 group shadow-2xl transition-all
        ${isWinner ? "w-80 h-[480px] z-20 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]" : "w-64 h-[380px] z-10 opacity-90 border-white/10"}`}
    >
      <img
        src={getDriverPhoto(d.driverId, d.code)}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 brightness-110 contrast-110"
        alt={d.familyName}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = getFlagUrl(d.nationality);
          e.currentTarget.className = "absolute inset-0 w-full h-full object-cover opacity-60 blur-[2px] scale-110";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
      <div className="absolute bottom-5 left-5 right-5 z-20">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-2xl">
          <div className="text-[10px] font-black text-red-500 tracking-[0.4em] uppercase mb-1">
            P{position} • {constructor}
          </div>
          <h2 className="text-3xl font-black italic text-white uppercase leading-none mb-1 tracking-tighter">
            {d.familyName}
          </h2>
          <div className="text-[9px] font-bold text-white/50 uppercase tracking-[0.3em]">
            {d.nationality}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  RACE RESULTS LIST                                                  */
/* ------------------------------------------------------------------ */
export const RaceResultsList = ({ results, onDriverClick }: { results: any[]; onDriverClick?: (code: string) => void }) => (
  <div className="space-y-2 w-full max-w-5xl mx-auto pb-20 px-3 sm:px-4">
    {results.map((res: any) => {
      const d = res.Driver ?? res;
      const timing = res.Time?.time ?? res.status;
      const accentColor = getConstructorColor(res.Constructor?.name ?? "");
      return (
        <motion.div
          key={`${res.position}-${d.driverId}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => onDriverClick?.(d.code)}
          className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-2xl sm:rounded-[2rem] backdrop-blur-xl border transition-all cursor-pointer overflow-hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: `3px solid ${accentColor}` }}
          whileHover={{ scale: 1.01, borderColor: accentColor + "60" }}
        >
          <span className="font-mono text-red-600 font-black w-6 sm:w-8 text-center text-sm sm:text-xl italic shrink-0">{res.position}</span>

          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
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

          <div className="flex-1 min-w-0">
            <div className="font-black uppercase leading-tight" style={{ color: "var(--text)" }}>
              <span className="hidden sm:inline text-xs">{d.givenName} </span>
              <span className="text-sm sm:text-xl font-black italic">{d.familyName}</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] truncate" style={{ color: "var(--text-3)" }}>
              {res.Constructor?.name}
            </div>
          </div>

          <span className="hidden sm:block text-xs font-mono font-bold shrink-0" style={{ color: "var(--text-2)" }}>
            {timing}
          </span>

          <div className="flex flex-col items-center justify-center min-w-[48px] sm:min-w-[64px] h-10 sm:h-12 rounded-xl sm:rounded-2xl shrink-0"
            style={{ background: "rgba(225,6,0,0.12)", border: "1px solid rgba(225,6,0,0.3)" }}>
            <span className="text-xs sm:text-[10px] font-black uppercase leading-none mb-0.5" style={{ color: "rgba(225,6,0,0.6)" }}>PTS</span>
            <span className="text-base sm:text-xl font-mono font-black italic" style={{ color: "#E10600" }}>
              {res.points ?? "0"}
            </span>
          </div>
        </motion.div>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/*  QUALIFYING RESULTS LIST                                            */
/* ------------------------------------------------------------------ */
export const QualifyingResultsList = ({ results }: { results: any[] }) => (
  <div className="w-full max-w-5xl mx-auto pb-20 px-4">
    <div className="space-y-3">
      {results.map((res: any) => {
        const d = res.Driver ?? res;
        const bestTime = res.Q3 ?? res.Q2 ?? res.Q1 ?? "--:--.---";
        const color = getConstructorColor(res.Constructor?.name ?? "");
        return (
          <motion.div
            key={res.position}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-5 p-4 rounded-[2rem] backdrop-blur-xl border transition-all"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
            whileHover={{ scale: 1.01 }}
          >
            <span className="font-mono text-red-600 font-black w-8 text-center text-xl italic shrink-0">{res.position}</span>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
              <img src={getDriverPhoto(d.driverId, d.code)} className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getFlagUrl(d.nationality); e.currentTarget.className = "w-full h-full object-cover opacity-60 scale-125"; }} />
            </div>
            <div className="w-1 h-10 rounded-full shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black uppercase" style={{ color: "var(--text)" }}>
                {d.givenName} <span className="text-2xl font-black italic">{d.familyName}</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
                {res.Constructor?.name}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center min-w-[120px] h-14 rounded-2xl border shrink-0"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <span className="text-[8px] font-black uppercase mb-0.5" style={{ color: "var(--text-3)" }}>Best Lap</span>
              <span className="text-lg font-mono font-black italic" style={{ color: "var(--text)" }}>{bestTime}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  SPRINT RESULTS LIST                                                */
/* ------------------------------------------------------------------ */
export const SprintResultsList = ({ results }: { results: any[] }) => (
  <div className="w-full max-w-5xl mx-auto pb-20 px-4">
    <div className="flex items-center gap-4 mb-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent" style={{ borderColor: "var(--border)" }} />
      <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em] italic">Sprint Classification</h3>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent" style={{ borderColor: "var(--border)" }} />
    </div>
    <div className="space-y-3">
      {results.map((res: any) => {
        const d = res.Driver;
        const hasScored = parseInt(res.position) <= 8;
        const color = getConstructorColor(res.Constructor?.name ?? "");
        return (
          <motion.div
            key={res.position}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-5 p-4 rounded-[1.5rem] border transition-all"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <span className="font-mono text-red-600 font-black w-8 text-center text-xl italic shrink-0">{res.position}</span>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
              <img src={getDriverPhoto(d.driverId, d.code)} className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getFlagUrl(d.nationality); e.currentTarget.className = "w-full h-full object-cover opacity-60 scale-125"; }} />
            </div>
            <div className="w-1 h-10 rounded-full shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black uppercase" style={{ color: "var(--text)" }}>
                {d.givenName} <span className="text-xl italic">{d.familyName}</span>
              </div>
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                {res.Constructor?.name}
              </div>
            </div>
            <div className={`flex flex-col items-center justify-center min-w-[68px] h-13 rounded-2xl border shrink-0 ${hasScored ? "bg-red-600 border-red-500" : ""}`}
              style={!hasScored ? { background: "var(--card)", borderColor: "var(--border)", opacity: 0.4 } : {}}>
              <span className="text-[8px] font-black uppercase text-white/70 leading-none mb-0.5">Pts</span>
              <span className="text-2xl font-mono font-black italic text-white">{res.points ?? "0"}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  SEASON STANDINGS — FIXED LOGOS + ALWAYS-VISIBLE SCORES           */
/* ------------------------------------------------------------------ */
export const SeasonStandings = ({
  drivers,
  teams,
  year,
}: {
  drivers: any[];
  teams: any[];
  year: string;
}) => {
  return (
    <div className="mt-8 pb-20 px-3 sm:px-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">

        {/* ---- DRIVER STANDINGS ---- */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-4 px-1">Driver Standings</h3>
          {drivers.length > 0 ? drivers.map((s, idx) => {
            const teamName = s.Constructors?.[0]?.name ?? "";
            const accent = getConstructorColor(teamName);
            const d = s.Driver;
            return (
              <motion.div
                key={d.driverId}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-2 sm:gap-3 group"
              >
                <span className="font-mono text-[10px] w-5 text-right shrink-0" style={{ color: "var(--text-3)" }}>{s.position}</span>

                <div className="flex-1 flex items-center rounded-xl sm:rounded-2xl border overflow-hidden transition-all"
                  style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: `3px solid ${accent}` }}>

                  {/* Driver info */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border shrink-0" style={{ borderColor: `${accent}55` }}>
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
                    <div className="flex flex-col min-w-0">
                      <span className="font-black uppercase italic text-xs sm:text-sm leading-tight truncate" style={{ color: "var(--text)" }}>
                        {d.familyName}
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest truncate" style={{ color: "var(--text-3)" }}>
                        {teamName}
                      </span>
                    </div>
                  </div>

                  {/* Team logo — tablet+ only */}
                  <div className="hidden sm:flex items-center pr-3 shrink-0">
                    <TeamLogoBadge teamName={teamName} teamColor={accent} size={36} />
                  </div>

                  {/* Points */}
                  <div className="flex items-center justify-center w-12 sm:w-16 h-full shrink-0 border-l py-2 px-2 sm:px-3"
                    style={{ borderColor: "var(--border)" }}>
                    <span className="font-mono font-black text-sm sm:text-lg" style={{ color: "var(--text)" }}>
                      {s.points}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div className="space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl skeleton" />
              ))}
            </div>
          )}
        </div>

        {/* ---- CONSTRUCTOR STANDINGS ---- */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-4 px-1">Constructor Standings</h3>
          {teams.length > 0 ? teams.map((s, idx) => {
            const accent = getConstructorColor(s.Constructor.name);
            return (
              <motion.div
                key={s.Constructor.constructorId}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1.0, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-2 sm:gap-3 group"
              >
                <span className="font-mono text-[10px] w-5 text-right shrink-0" style={{ color: "var(--text-3)" }}>{s.position}</span>

                <div className="flex-1 flex items-center rounded-xl sm:rounded-2xl border overflow-hidden transition-all"
                  style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: `3px solid ${accent}` }}>

                  {/* Team info */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 flex-1 min-w-0">
                    <div className="sm:hidden shrink-0">
                      <TeamLogoBadge teamName={s.Constructor.name} teamColor={accent} size={32} />
                    </div>
                    <div className="hidden sm:block shrink-0">
                      <TeamLogoBadge teamName={s.Constructor.name} teamColor={accent} size={44} />
                    </div>
                    <span className="font-black uppercase italic text-xs sm:text-sm truncate" style={{ color: "var(--text)" }}>
                      {s.Constructor.name}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="flex items-center justify-center w-12 sm:w-16 h-full shrink-0 border-l py-2 px-2 sm:px-3"
                    style={{ borderColor: "var(--border)" }}>
                    <span className="font-mono font-black text-sm sm:text-lg" style={{ color: "var(--text)" }}>
                      {s.points}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl skeleton" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

