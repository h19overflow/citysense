/**
 * Loads transit route data from static JSON.
 * In dev: served from public/data/transit_routes.json
 * Falls back to MATS hardcoded schedule if file not available.
 */
import type { TransitRoute } from "./types";

interface TransitData {
  routes: {
    id: string;
    name: string;
    number: string;
    schedule: {
      weekday?: { start: string; end: string; frequency_minutes: number };
      saturday?: { start: string; end: string; frequency_minutes: number };
    };
    description?: string;
  }[];
}

function parseTransitRoute(raw: TransitData["routes"][number]): TransitRoute {
  return {
    id: raw.id,
    name: raw.name,
    number: raw.number,
    schedule: {
      weekday: raw.schedule.weekday
        ? {
            start: raw.schedule.weekday.start,
            end: raw.schedule.weekday.end,
            frequencyMinutes: raw.schedule.weekday.frequency_minutes,
          }
        : undefined,
      saturday: raw.schedule.saturday
        ? {
            start: raw.schedule.saturday.start,
            end: raw.schedule.saturday.end,
            frequencyMinutes: raw.schedule.saturday.frequency_minutes,
          }
        : undefined,
    },
    description: raw.description,
  };
}

/** Known MATS routes as fallback until scraper data is available */
const WK = { start: "5:00 AM", end: "9:00 PM", frequencyMinutes: 60 };
const SAT = { start: "7:30 AM", end: "6:30 PM", frequencyMinutes: 60 };
const MATS_FALLBACK_ROUTES: TransitRoute[] = [
  { id: "mats-1", name: "Route 1 AUM Eastchase", number: "1", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-2", name: "Route 2 Eastdale Mall", number: "2", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-3", name: "Route 3 Montgomery Commons", number: "3", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-4", name: "Route 4 Boylston", number: "4", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-5", name: "Route 5 McGhee Road", number: "5", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-6", name: "Route 6 Southlawn Twingates", number: "6", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-7", name: "Route 7 Maxwell AFB", number: "7", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-8", name: "Route 8 Gunter Annex", number: "8", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-9", name: "Route 9 Virginia Loop", number: "9", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-10", name: "Route 10 South Court St.", number: "10", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-11", name: "Route 11 Rosa Parks / South Blvd.", number: "11", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-12", name: "Route 12 Smiley Court Gibbs Village", number: "12", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-16", name: "Route 16 East-West Connector", number: "16", schedule: { weekday: WK, saturday: SAT } },
  { id: "mats-17", name: "Route 17 Boulevard", number: "17", schedule: { weekday: WK, saturday: SAT } },
];

export async function fetchTransitRoutes(): Promise<TransitRoute[]> {
  try {
    const response = await fetch("/data/transit_routes.json");
    if (!response.ok) {
      console.warn("Transit data not available, using fallback MATS routes");
      return MATS_FALLBACK_ROUTES;
    }
    const data: TransitData = await response.json();
    return data.routes.map(parseTransitRoute);
  } catch {
    console.warn("Failed to load transit data, using fallback");
    return MATS_FALLBACK_ROUTES;
  }
}
