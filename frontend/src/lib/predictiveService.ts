/**
 * Predictive Analysis API client.
 *
 * Fetches hotspot predictions and trend data from the backend.
 */

import type { PredictionHotspot, PredictionTrend } from "./types";
import { API_BASE } from "./apiConfig";

interface HotspotsResponse {
  hotspots: PredictionHotspot[];
  timestamp: string;
  weights: Record<string, number>;
}

interface TrendsResponse {
  trends: PredictionTrend[];
  timestamp: string;
}

export async function fetchHotspots(): Promise<HotspotsResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/api/predictions/hotspots`);
    if (!response.ok) return null;
    return (await response.json()) as HotspotsResponse;
  } catch {
    return null;
  }
}

export async function fetchTrends(): Promise<TrendsResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/api/predictions/trends`);
    if (!response.ok) return null;
    return (await response.json()) as TrendsResponse;
  } catch {
    return null;
  }
}
