import type { ServiceCategory } from "./services";

export type MapCommandType = "filter_category" | "zoom_to" | "highlight_hotspots" | "clear";

export interface PredictionHotspot {
  area_id: string;
  neighborhood: string;
  category: string;
  hotspot_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  drivers: { factor: string; value: number; weight: number; contribution: number }[];
  trend_direction: "rising" | "falling" | "stable";
  recommended_label_for_ui: string;
  explanation: string;
}

export interface PredictionTrend {
  category: string;
  current_volume: number;
  previous_volume: number;
  growth_rate: number;
  trend_direction: "rising" | "falling" | "stable";
  top_neighborhoods: string[];
  explanation: string;
}

export interface MapCommand {
  id: string;
  type: MapCommandType;
  category?: ServiceCategory;
  lat?: number;
  lng?: number;
  zoom?: number;
  label?: string;
  hotspots?: PredictionHotspot[];
}

export interface NeighborhoodActivity {
  name: string;
  articleCount: number;
  reactionCount: number;
  commentCount: number;
  topSentiment: "positive" | "neutral" | "negative";
  centerLat: number;
  centerLng: number;
}
