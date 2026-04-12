"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/** * 1. NATIONALITY MAPPING 
 * Maps F1 API strings to ISO codes for FlagCDN fallbacks
 */
const nationalityToCountry: Record<string, string> = {
    "Argentine": "ar", "Italian": "it", "British": "gb", "French": "fr",
    "German": "de", "American": "us", "Brazilian": "br", "Spanish": "es",
    "Austrian": "at", "Australian": "au", "Finnish": "fi", "Dutch": "nl",
    "Belgian": "be", "Swiss": "ch", "Mexican": "mx", "Monaco": "mc", "Monegasque": "mc",
    "Japanese": "jp", "Indian": "in", "Canadian": "ca", "Swedish": "se", "Rhodesian": "zw",
    "Danish": "dk", "Thai": "th", "Chinese": "cn", "Polish": "pl", "USA": "us",
    "Colombian": "co", "Portuguese": "pt", "Russian": "ru", "South Korean": "kr", "Turkish": "tr", "Venezuelan": "ve", "Irish": "ie", "Chilean": "cl", "New Zealander": "nz", "South African": "za",
};

const circuitSpeedData: Record<string, number> = {
    "monza": 354,        // The Temple of Speed
    "vegas": 348,        // The Strip
    "mexico_city": 350,  // High Altitude
    "spa": 342,          // Kemmel Straight
    "baku": 345,         // Longest straight
    "silverstone": 332,
    "jeddah": 340,
    "marina_bay": 305,   // Slow Street Circuit
    "monaco": 290,       // Slowest
    "albert_park": 328,
    "miami": 335,
    "interlagos": 330
};

/**
 * 2. CIRCUIT ID MAPPING
 * Bridges Ergast API IDs to your local SVG filenames
 */
const circuitIdMap: Record<string, string> = {
    "albert_park": "melbourne",
    "losail": "lusail",
    "ricard": "paul-ricard",
    "catalunya": "catalunya",
    "interlagos": "interlagos",
    "villeneuve": "montreal",
    "rodriguez": "mexico-city",
    "red_bull_ring": "spielberg",
    "spa": "spa-francorchamps",
    "americas": "austin",
    "yas_marina": "yas-marina",
    "marina_bay": "marina-bay",
    "galvez": "buenos-aires",
    "kyalami": "kyalami",
    "hockenheimring": "hockenheimring",
    "hungaroring": "hungaroring",
    "monaco": "monaco",
    "monza": "monza",
    "silverstone": "silverstone",
    "suzuka": "suzuka",
    "zandvoort": "zandvoort",
    "jeddah": "jeddah",
    "baku": "baku",
    "shanghai": "shanghai",
    "vegas": "las-vegas",
    "caesars_palace": "caesars-palace",
    "miami": "miami",
    "bahrain": "bahrain",
    "circuit de nevers magny-cours": "circuit de nevers magny-cours"
};
const liveTracks2026 = [
    "albert_park", "vegas", "jeddah", "shanghai", "miami", "monaco",
    "villeneuve", "barcelona", "red_bull_ring", "silverstone", "hungaroring",
    "spa", "zandvoort", "monza", "baku", "marina_bay", "americas",
    "rodriguez", "interlagos", "lusail", "yas_marina"
];
// --- ASSET HELPERS ---

const getFlagUrl = (nationality: string) => {
    // Manual overrides for historical drivers
    if (nationality === "Rhodesian") return `https://flagcdn.com/w160/zw.png`;

    const code = nationalityToCountry[nationality] || "un";
    return `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code.toUpperCase()}.svg`;
};

const getDriverPhoto = (driverId: string, code?: string) => {
    if (code) return `/drivers/${code.toUpperCase()}.png`;
    return `/drivers/${driverId.toLowerCase()}.png`;
};

// --- 1. LIVE DATA STRIP ---
export const LiveTelemetryStrip = ({ isUpcoming }: { isUpcoming: boolean }) => {
    if (!isUpcoming) return null;
    return (
        <div className="mt-6 flex gap-3 animate-in fade-in slide-in-from-left-4">
            <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 italic">
                    Scouting Protocol Active
                </span>
            </div>
        </div>
    );
};

// --- 2. CIRCUIT DISPLAY (MAPPED & VISIBLE) ---
export const CircuitDisplay = ({ circuitId, year }: { circuitId: string, year: string }) => {
    const fileName = circuitIdMap[circuitId] || circuitId;
    const circuitPath = `/circuits/${fileName}-1.svg`;

    // We still keep the 'isLive' check for the tech-readout labels, 
    // but we remove the 'dimming' logic so visibility is 100% for all years.
    const isLiveUplink = year === "2026";

    return (
        <div className="flex flex-col items-start group">
            {/* The container is now consistently bright for all years */}
            <div className="relative w-80 h-48 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-8 flex items-center justify-center overflow-hidden transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] hover:border-red-500/50">

                {/* Dynamic Scanline - We keep this for both to show "Active System" */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-transparent h-24 w-full animate-scanline ${isLiveUplink ? 'via-red-500/20' : 'via-white/10'}`} />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                </div>

                {/* HIGH VISIBILITY Track Layout (Invert + High Brightness for ALL years) */}
                <img
                    src={circuitPath}
                    alt="Circuit Architecture"
                    className="max-w-[85%] max-h-[85%] object-contain invert brightness-[4] contrast-[1.2] drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] transition-all duration-1000 scale-110 group-hover:scale-125"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `/circuits/${fileName}.svg`;
                    }}
                />

                {/* Status Indicator */}
                <div className="absolute bottom-5 left-8 flex items-center gap-3">
                    {/* Pulsing light: Red for 2026, White for Historical */}
                    <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${isLiveUplink ? 'bg-red-500 shadow-red-500/50' : 'bg-white shadow-white/50'}`} />

                    <div className="flex flex-col text-left">
                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] leading-none ${isLiveUplink ? 'text-red-500' : 'text-white'}`}>
                            {isLiveUplink ? 'Uplink: Live 2026' : `Uplink: Archive ${year}`}
                        </span>
                        <span className="text-[6px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1">
                            {isLiveUplink ? 'Strategic Scouting Mode' : 'Historical Geometry Verified'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- 3. PODIUM CARD (COLORED + FLAG FALLBACK) ---
export const PodiumCard = ({ driver, position }: { driver: any, position: number }) => {
    if (!driver) return null;
    const isWinner = position === 1;
    const d = driver.Driver || driver;
    const constructor = driver.Constructor?.name || "Independent";

    return (
        <motion.div
            whileHover={{ y: -15, scale: 1.05 }}
            className={`relative overflow-hidden rounded-[2.5rem] border bg-zinc-900 group shadow-2xl transition-all
        ${isWinner
                    ? 'w-80 h-[480px] z-20 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)] mt-20' // Added mt-20 to move winner down
                    : 'w-64 h-[380px] z-10 opacity-90 border-white/10 mt-32' // Increased mt-10 to mt-32 to move p2/p3 down
                }`}
        >
            <img
                src={getDriverPhoto(d.driverId, d.code)}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 brightness-110 contrast-110"
                alt={d.familyName}
                onError={(e) => {
                    e.currentTarget.src = getFlagUrl(d.nationality);
                    e.currentTarget.className = "absolute inset-0 w-full h-full object-cover opacity-60 blur-[2px] scale-110 transition-all brightness-125";
                }}
            />
            {/* Sharper Gradient for better text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />

            <div className="absolute bottom-5 left-5 right-5 z-20">
                <div className="bg-black/60 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 shadow-2xl">
                    <div className="text-[10px] font-black text-red-500 tracking-[0.4em] uppercase mb-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                        P{position} • {constructor}
                    </div>
                    <h2 className="text-3xl font-black italic text-white uppercase leading-none mb-1 tracking-tighter drop-shadow-md">
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

// --- 4. RACE RESULTS LIST (COLORED + FLAG FALLBACK) ---
export const RaceResultsList = ({ results, onDriverClick }: { results: any[], onDriverClick?: (code: string) => void }) => {
    return (
        <div className="space-y-3 w-full max-w-5xl mx-auto pb-20 px-4">
            {results.map((res: any) => {
                const d = res.Driver || res;
                const timing = res.Time ? res.Time.time : res.status;

                return (
                    <motion.div
                        // COMBINED UNIQUE KEY
                        key={`${res.position}-${d.driverId}`}
                        onClick={() => onDriverClick?.(d.code)}
                        className="flex items-center gap-6 p-5 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group cursor-pointer overflow-hidden"
                    >
                        <span className="font-mono text-red-600 font-black w-8 text-center text-xl italic">{res.position}</span>

                        <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center relative">
                            <img
                                src={getDriverPhoto(d.driverId, d.code)}
                                className="w-full h-full object-cover relative z-10"
                                alt={d.familyName}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    const target = e.currentTarget;

                                    // 1. Get the flag URL (will return 'un' if nationality is missing)
                                    const flagUrl = getFlagUrl(d.nationality);

                                    // 2. Prevent infinite loops if the flag itself is missing
                                    if (target.src !== flagUrl) {
                                        target.src = flagUrl;

                                        // 3. Styling fixes to hide the 'broken' icon and zoom in on flag
                                        target.style.transform = "scale(1.8)";
                                        target.style.objectFit = "cover";

                                        // 4. Fallback styling for the container
                                        const parent = target.parentElement;
                                        if (parent) {
                                            parent.style.backgroundColor = "#18181b"; // zinc-900
                                        }
                                    }
                                }}
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-baseline justify-between w-full">
                                <div className="text-sm font-black uppercase text-white/90">
                                    {d.givenName} <span className="text-2xl font-black italic">{d.familyName}</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-zinc-400 group-hover:text-red-500 transition-colors pr-6">
                                    {timing}
                                </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                                {res.Constructor?.name}
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center min-w-[80px] h-16 rounded-[1.5rem] bg-red-600 shadow-[0_0_20px_rgba(225,6,0,0.3)]">
                            <span className="text-3xl font-mono font-black italic text-white">{res.points || "0"}</span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};



// --- 5. QUALIFYING RESULTS LIST (COLORED + FLAG FALLBACK) ---
export const QualifyingResultsList = ({ results }: { results: any[] }) => {
    return (
        <div className="mt-24 w-full max-w-5xl mx-auto pb-20 px-4 relative z-50">
            <div className="space-y-4">
                {results.map((res: any) => {
                    const d = res.Driver || res;
                    const bestTime = res.Q3 || res.Q2 || res.Q1 || "--:--.---";
                    return (
                        <motion.div key={res.position} className="flex items-center gap-6 p-5 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group shadow-xl">
                            <span className="font-mono text-red-600 font-black w-8 text-center text-xl italic">{res.position}</span>
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                                <img
                                    src={getDriverPhoto(d.driverId, d.code)}
                                    className="w-full h-full object-cover transition-all"
                                    onError={(e) => {
                                        e.currentTarget.src = getFlagUrl(d.nationality);
                                        e.currentTarget.className = "w-full h-full object-cover opacity-60 scale-125";
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black uppercase text-white/90">{d.givenName} <span className="text-2xl font-black italic">{d.familyName}</span></div>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{res.Constructor?.name}</div>
                            </div>
                            <div className="flex flex-col items-center justify-center min-w-[120px] h-16 rounded-[1.5rem] border border-white/20 bg-white/5 shadow-lg group-hover:border-red-600/50 transition-colors">
                                <span className="text-[9px] font-black uppercase leading-none mb-1 text-zinc-500 group-hover:text-red-600 text-center">Best Lap</span>
                                <span className="text-xl font-mono font-black italic text-white tracking-tighter">{bestTime}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

// --- 6. SEASON STANDINGS (WITH TEAM LOGO WATERMARKS) ---
export const SeasonStandings = ({ drivers, teams, year }: { drivers: any[], teams: any[], year: string }) => {

    // 1. DYNAMIC COLOR ENGINE (1950 - Now)
    const getConstructorColor = (name: string): string => {
        const teamName = name.toLowerCase();
        const staticColors: Record<string, string> = {
            "red bull": "#3671C6", "ferrari": "#E8002D", "mercedes": "#27F4D2",
            "mclaren": "#FF8000", "aston martin": "#229971", "alpine": "#0093CC",
            "williams": "#64C4FF", "haas": "#B6BABD", "rb": "#6692FF",
            "sauber": "#52E252", "audi": "#EB4526", "lotus": "#FFB800",
            "benetton": "#008860", "tyrrell": "#001DFF", "brabham": "#002344",
            "jordan": "#FFD700", "jaguar": "#004225", "bmw": "#FFFFFF"
        };
        const match = Object.keys(staticColors).find(key => teamName.includes(key));
        if (match) return staticColors[match];

        let hash = 0;
        for (let i = 0; i < teamName.length; i++) {
            hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return "#" + (hash & 0x00FFFFFF).toString(16).padStart(6, '0').toUpperCase();
    };

    // 2. LOGO PATH ENGINE
    const getLogoPath = (name: string) => {
        if (!name) return "";
        const rawName = name.toLowerCase();
        const teamFiles: Record<string, { file: string; ext: string }> = {
            "cadillac": { file: "cad", ext: 'jpeg' },
            "toyota": { file: "toyota-f1", ext: 'svg' },
            "arrows": { file: "arrows-f1", ext: 'jpeg' },
            "jordan": { file: "b-h-jordan", ext: 'jpeg' },
            "jaguar": { file: "jaguar-racing", ext: 'svg' },
            "lotus": { file: "lotus-f1-team-logo", ext: 'svg' },
            "force india": { file: "logo-force-india-f1-team-2011", ext: 'svg' },
            "minardi": { file: "minardi-f1-3", ext: 'svg' },
            "red bull": { file: "red%20bull", ext: 'png' },
            "ferrari": { file: "ferrari", ext: 'png' },
            "mercedes": { file: "mercedes", ext: 'png' },
            "mclaren": { file: "mclaren", ext: 'png' },
            "aston martin": { file: "aston%20martin", ext: 'png' },
            "alpine": { file: "alpinef1team", ext: 'png' },
            "williams": { file: "williams", ext: 'png' },
            "haas": { file: "haasf1team", ext: 'png' },
            "alphatauri": { file: "alphataurif1team", ext: 'png' },
            "rb": { file: "alphataurif1team", ext: 'png' },
            "audi": { file: "audi", ext: 'png' },
            "sauber": { file: "sauber", ext: 'png' },
            "alfa romeo": { file: "alfa%20romeo", ext: 'png' },
            "honda": { file: "HondaRacing", ext: 'jpeg' },
        };

        const matchKey = Object.keys(teamFiles).find(key => rawName.includes(key));
        if (matchKey) {
            const { file, ext } = teamFiles[matchKey];
            return `/teams/grid/${file}.${ext}`;
        }
        return `/teams/grid/${rawName.split(' ')[0]}.png`;
    };

    // 3. COMPLETE NATIONALITY MAP (1950 - Now)
    const getFlagUrl = (nationality: string) => {
        const countryMap: Record<string, string> = {
            'British': 'gb', 'Dutch': 'nl', 'Monegasque': 'mc', 'Spanish': 'es',
            'Mexican': 'mx', 'German': 'de', 'French': 'fr', 'Canadian': 'ca',
            'Australian': 'au', 'Japanese': 'jp', 'Thai': 'th', 'Danish': 'dk',
            'Finnish': 'fi', 'Chinese': 'cn', 'American': 'us', 'Brazilian': 'br',
            'Italian': 'it', 'Polish': 'pl', 'Russian': 'ru', 'New Zealander': 'nz',
            'Belgian': 'be', 'Swedish': 'se', 'Austrian': 'at', 'Swiss': 'ch',
            'Portuguese': 'pt', 'Irish': 'ie', 'Hungarian': 'hu', 'Czech': 'cz',
            'Argentine': 'ar', 'Colombian': 'co', 'Venezuelan': 've', 'Chilean': 'cl',
            'South African': 'za', 'Rhodesian': 'zw', 'Indian': 'in', 'Malaysian': 'my'
        };
        const code = countryMap[nationality] || 'un';
        return `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code.toUpperCase()}.svg`;
    };

    return (
        <div className="mt-10 pb-20 px-4 relative z-50 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

                {/* Driver Standings */}
                <div className="space-y-4">
                    <h3 className="text-[12px] font-black text-red-600 uppercase tracking-[0.5em] mb-6 px-4">Driver Standings</h3>
                    {drivers && drivers.length > 0 ? (
                        drivers.map((s) => {
                            const teamName = s.Constructors?.[0]?.name || "";
                            const accentColor = getConstructorColor(teamName);

                            return (
                                <div key={s.Driver.driverId} className="flex items-center gap-4 group">
                                    <span className="font-mono text-zinc-600 w-6 italic text-xs">{s.position}</span>
                                    <div
                                        className="relative flex-1 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/10 transition-all overflow-hidden min-h-[100px]"
                                        style={{ borderLeft: `4px solid ${accentColor}` }}
                                    >
                                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                                            <img
                                                src={getLogoPath(teamName)}
                                                className="h-[120%] w-[100%] object-contain grayscale brightness-200"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>

                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-zinc-900 shadow-xl shrink-0 flex items-center justify-center">
                                                <img
                                                    src={getDriverPhoto(s.Driver.driverId, s.Driver.code)}
                                                    className="w-full h-full object-cover transition-transform duration-500"
                                                    alt={s.Driver.familyName}
                                                    onError={(e) => {
                                                        e.currentTarget.src = getFlagUrl(s.Driver.nationality);
                                                        e.currentTarget.style.transform = "scale(1.8)";
                                                        e.currentTarget.style.objectFit = "cover";
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black uppercase italic text-base tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                                                    {s.Driver.familyName}
                                                </span>
                                                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest leading-none">
                                                    {teamName}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-red-600 font-black font-mono text-xl relative z-10">
                                            {s.points}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center opacity-20 italic">Awaiting Driver Statistics...</div>
                    )}
                </div>

                {/* Constructor Standings */}
                <div className="space-y-4">
                    <h3 className="text-[12px] font-black text-red-600 uppercase tracking-[0.5em] mb-6 px-4">Constructor Standings</h3>
                    {teams?.map((s) => {
                        const accentColor = getConstructorColor(s.Constructor.name);
                        return (
                            <div key={s.Constructor.constructorId} className="flex items-center gap-4 group">
                                <span className="font-mono text-zinc-600 w-6 italic text-xs">{s.position}</span>
                                <div
                                    className="relative flex-1 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/10 transition-all overflow-hidden min-h-[100px]"
                                    style={{ borderLeft: `4px solid ${accentColor}` }}
                                >
                                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
                                        <img
                                            src={getLogoPath(s.Constructor.name)}
                                            className="h-[140%] w-[90%] object-contain grayscale brightness-200"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
                                    </div>

                                    <span className="font-black uppercase italic text-lg tracking-widest text-white relative z-10 drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
                                        {s.Constructor.name}
                                    </span>
                                    <span className="text-red-600 font-black font-mono text-xl relative z-10">
                                        {s.points}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
// --- 7. PREDICTION CARD ---
export const PredictionCard = ({ driverName, gridPos, winProb }: { driverName: string, gridPos: number, winProb: number }) => {
    return (
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl overflow-hidden group pointer-events-auto">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Scouting Win Prob</span>
                    <h4 className="text-2xl font-black italic text-white uppercase leading-none">{driverName}</h4>
                </div>
                <div className="bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold">P{gridPos}</div>
            </div>
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${winProb}%` }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400" />
            </div>
            <div className="mt-2 text-right font-mono text-sm font-bold text-white">{winProb}%</div>
        </div>
    );
};

// --- 8. SPRINT RESULTS LIST (COLORED + FLAG FALLBACK) ---
export const SprintResultsList = ({ results }: { results: any[] }) => {
    return (
        <div className="mt-32 w-full max-w-5xl mx-auto pb-32 px-4 relative z-50">
            <div className="flex items-center gap-4 mb-8 px-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em] italic">Sprint Classification</h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>
            <div className="space-y-3">
                {results.map((res: any) => {
                    const d = res.Driver;
                    const points = res.points || "0";
                    const hasScored = parseInt(res.position) <= 8;
                    return (
                        <motion.div key={res.position} className="flex items-center gap-6 p-4 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-red-600/30 transition-all group relative overflow-hidden">
                            <span className="font-mono text-red-600 font-black w-8 text-center text-xl italic">{res.position}</span>
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                                <img
                                    src={getDriverPhoto(d.driverId, d.code)}
                                    className="w-full h-full object-cover transition-all"
                                    onError={(e) => {
                                        e.currentTarget.src = getFlagUrl(d.nationality);
                                        e.currentTarget.className = "w-full h-full object-cover opacity-60 scale-125";
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black uppercase text-white tracking-tight">{d.givenName} <span className="text-xl italic">{d.familyName}</span></div>
                                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{res.Constructor?.name}</div>
                            </div>
                            <div className={`flex flex-col items-center justify-center min-w-[70px] h-14 rounded-2xl border transition-all ${hasScored ? 'bg-red-600 border-red-500 shadow-lg' : 'bg-white/5 border-white/10 opacity-30'}`}>
                                <span className="text-[8px] font-black uppercase text-white/70 leading-none mb-1 text-center">Points</span>
                                <span className="text-2xl font-mono font-black italic text-white leading-none text-center">{points}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};