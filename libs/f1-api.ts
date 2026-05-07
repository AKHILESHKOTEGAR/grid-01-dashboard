// lib/f1-api.ts
const BASE_URL = "https://api.jolpi.ca/ergast/f1";
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
/**
 * Core fetcher for F1 data.
 * Always targets the 2026 season for current live telemetry.
 */
export const fetchF1Data = async (endpoint: string) => {
    await delay(300);
    try {
        const response = await fetch(`${BASE_URL}/2026/${endpoint}.json`, {
            next: { revalidate: 3600 }, // Cache for 1 hour to stay within rate limits
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        return data.MRData;
    } catch (error) {
        console.error(`Strategic Uplink Error [${endpoint}]:`, error);
        return null;
    }
};

/**
 * Fetches the current 2026 Driver Standings.
 * Essential for the 'Live Form' criteria in our Prediction Engine.
 */
export const getLatestStandings = async () => {
    const data = await fetchF1Data("driverStandings");
    return data?.StandingsTable?.StandingsLists[0]?.DriverStandings || [];
};

/**
 * Fetches the 2026 Race Schedule.
 * Used to identify completed vs. upcoming rounds for the simulator.
 */
export const get2026Schedule = async () => {
    // The Jolpica/Ergast endpoint for a season schedule is just the year
    const response = await fetch(`${BASE_URL}/2026.json`);
    const data = await response.json();
    return data?.MRData?.RaceTable?.Races || [];
};

/**
 * Fetches detailed results for a specific round.
 * Useful for analyzing the winner's performance in the Scouting Report.
 */
export const getRaceResults = async (round: string) => {
    const data = await fetchF1Data(`${round}/results`);
    return data?.RaceTable?.Races?.[0] || null;
};

/**
 * Helper to identify the current round based on date.
 * (As of April 14, 2026, we are between Japan and Miami)
 */
export const getCurrentRound = (races: any[]) => {
    const now = new Date();
    const pastRaces = races.filter(race => new Date(race.date) < now);
    return pastRaces.length > 0 ? pastRaces[pastRaces.length - 1].round : "1";
};

// lib/f1-api.ts
export const get2026LiveData = async () => {
    const res = await fetch("https://api.jolpi.ca/ergast/f1/2026/driverStandings.json");
    const data = await res.json();
    return data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
};