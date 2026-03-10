export interface NeighborhoodScore {
  zip: string;
  score: number;
  label: string;
  counts: {
    "311": number;
    violations: number;
    permits: number;
    flood: number;
    paving: number;
  };
}

interface ScoreFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: NeighborhoodScore;
}

interface ScoreCollection {
  type: "FeatureCollection";
  features: ScoreFeature[];
  metadata: { generated_at: string; weights: Record<string, number> };
}

let cachedData: ScoreCollection | null = null;

export async function loadNeighborhoodScores(): Promise<ScoreCollection> {
  if (cachedData) return cachedData;
  const resp = await fetch("/data/neighborhood_scores.geojson");
  cachedData = await resp.json();
  return cachedData!;
}

export function getScoreByZip(
  zip: string,
  data: ScoreCollection,
): NeighborhoodScore | null {
  const feature = data.features.find((f) => f.properties.zip === zip);
  return feature?.properties ?? null;
}

export function getAllScores(data: ScoreCollection): NeighborhoodScore[] {
  return data.features.map((f) => f.properties);
}

export function getScoreColor(score: number): string {
  if (score >= 70) return "#2D6A4F";
  if (score >= 40) return "#C8882A";
  return "#d83933";
}

export function getScoreLevel(score: number): "green" | "yellow" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}
