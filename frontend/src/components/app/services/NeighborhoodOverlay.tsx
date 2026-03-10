import { useEffect, useState } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import {
  loadNeighborhoodScores,
  getScoreColor,
  type NeighborhoodScore,
} from "@/lib/neighborhoodScorer";

interface ScoreFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: NeighborhoodScore;
}

const SIGNAL_META: { key: keyof NeighborhoodScore["counts"]; label: string; desc: string; good: "low" | "high" }[] = [
  { key: "311", label: "311 Requests", desc: "Resident complaints (potholes, trash, noise)", good: "low" },
  { key: "violations", label: "Code Violations", desc: "Building & property code issues", good: "low" },
  { key: "permits", label: "Construction Permits", desc: "New builds & renovations — investment signal", good: "high" },
  { key: "paving", label: "Paving Projects", desc: "Road improvements funded by the city", good: "high" },
  { key: "flood", label: "Flood Zones", desc: "FEMA-designated flood hazard areas", good: "low" },
];

function SignalBar({ value, max, good }: { value: number; max: number; good: "low" | "high" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = good === "high"
    ? (pct > 50 ? "#2D6A4F" : "#C8882A")
    : (pct > 50 ? "#d83933" : "#2D6A4F");
  return (
    <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3 }} />
    </div>
  );
}

function ScorePopup({ feature }: { feature: ScoreFeature }) {
  const { zip, score, label, counts } = feature.properties;
  const color = getScoreColor(score);
  const maxCounts = SIGNAL_META.map((s) => counts[s.key]);
  const globalMax = Math.max(...maxCounts, 1);

  return (
    <div style={{ minWidth: 240, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 12, color: "#666" }}>/ 100</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 8px",
          borderRadius: 4, background: `${color}18`, color,
        }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>ZIP {zip} · Montgomery, AL</div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#333", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        City Data Signals
      </div>
      {SIGNAL_META.map(({ key, label: sigLabel, desc, good }) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>
              {good === "high" ? "↑" : "↓"} {sigLabel}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>{counts[key].toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SignalBar value={counts[key]} max={globalMax} good={good} />
            <span style={{ fontSize: 10, color: "#999", lineHeight: 1.2 }}>{desc}</span>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 10, padding: "6px 0", borderTop: "1px solid #e5e7eb", fontSize: 10, color: "#999" }}>
        ↑ Higher is better · ↓ Lower is better · Source: Montgomery ArcGIS
      </div>
    </div>
  );
}

export function NeighborhoodOverlay() {
  const [features, setFeatures] = useState<ScoreFeature[]>([]);

  useEffect(() => {
    loadNeighborhoodScores().then((data) => {
      setFeatures(data.features as ScoreFeature[]);
    });
  }, []);

  if (features.length === 0) return null;

  return (
    <>
      {features.map((feature) => {
        const { zip, score } = feature.properties;
        const [lng, lat] = feature.geometry.coordinates;
        const color = getScoreColor(score);

        return (
          <CircleMarker
            key={zip}
            center={[lat, lng]}
            radius={25}
            pathOptions={{ fillColor: color, fillOpacity: 0.25, color, weight: 2, opacity: 0.6 }}
          >
            <Popup><ScorePopup feature={feature} /></Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
