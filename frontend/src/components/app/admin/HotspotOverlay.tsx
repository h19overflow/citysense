import { useEffect, useState } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { fetchHotspots } from "@/lib/predictiveService";
import type { PredictionHotspot } from "@/lib/types";

interface HotspotOverlayProps {
  onAskAI?: (question: string) => void;
}

// Approximate lat/lng for Montgomery neighborhoods
const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  "Capitol Heights": [32.373, -86.305],
  "Cloverdale": [32.357, -86.295],
  "Old Cloverdale": [32.355, -86.298],
  "Midtown": [32.370, -86.295],
  "Downtown": [32.377, -86.300],
  "West Montgomery": [32.370, -86.330],
  "East Montgomery": [32.370, -86.260],
  "Dalraida": [32.400, -86.270],
  "McGehee": [32.340, -86.280],
  "Normandale": [32.395, -86.310],
  "Chisholm": [32.345, -86.320],
  "Woodmere": [32.385, -86.275],
};

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

function PopupContent({ hotspot, onAskAI }: { hotspot: PredictionHotspot; onAskAI?: (q: string) => void }) {
  const color = RISK_COLORS[hotspot.risk_level] || "#888";

  return (
    <div style={{ minWidth: 200, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>
          {Math.round(hotspot.hotspot_score)}
        </span>
        <span style={{ fontSize: 11, color: "#666" }}>/ 100</span>
        <span style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 600,
          padding: "2px 6px", borderRadius: 4,
          background: `${color}18`, color,
          textTransform: "uppercase",
        }}>
          {hotspot.risk_level}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
        {hotspot.neighborhood}
      </div>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
        {hotspot.category} · {hotspot.trend_direction}
      </div>
      <div style={{ fontSize: 11, color: "#444", lineHeight: 1.4, marginBottom: 8 }}>
        {hotspot.explanation}
      </div>
      {onAskAI && (
        <button
          onClick={() => onAskAI(`Tell me about the ${hotspot.risk_level} risk hotspot in ${hotspot.neighborhood} for ${hotspot.category}. What's driving the score of ${Math.round(hotspot.hotspot_score)} and what should we do about it?`)}
          style={{
            width: "100%", padding: "6px 10px", fontSize: 11, fontWeight: 600,
            background: "#f0f0ff", color: "#4338ca", border: "1px solid #c7d2fe",
            borderRadius: 6, cursor: "pointer",
          }}
        >
          Ask AI Analyst
        </button>
      )}
    </div>
  );
}

export function HotspotOverlay({ onAskAI }: HotspotOverlayProps) {
  const [hotspots, setHotspots] = useState<PredictionHotspot[]>([]);

  useEffect(() => {
    fetchHotspots().then((data) => {
      if (data) setHotspots(data.hotspots);
    });
  }, []);

  if (hotspots.length === 0) return null;

  return (
    <>
      {hotspots.map((h) => {
        const coords = NEIGHBORHOOD_COORDS[h.neighborhood];
        if (!coords) return null;
        const color = RISK_COLORS[h.risk_level] || "#888";
        const radius = h.risk_level === "critical" ? 30 : h.risk_level === "high" ? 24 : 18;

        return (
          <CircleMarker
            key={h.area_id}
            center={coords}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.3,
              color,
              weight: 2,
              opacity: 0.7,
            }}
          >
            <Popup>
              <PopupContent hotspot={h} onAskAI={onAskAI} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
