import type { PredictionHotspot } from "@/lib/types";

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const RISK_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

interface PredictiveInsightCardProps {
  hotspots: PredictionHotspot[];
}

export default function PredictiveInsightCard({ hotspots }: PredictiveInsightCardProps) {
  if (hotspots.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-slate-50 to-white p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">📊</span>
        <span className="text-xs font-semibold text-foreground">Predictive Insights</span>
      </div>
      <div className="space-y-1.5">
        {hotspots.map((h) => {
          const color = RISK_COLORS[h.risk_level] || "#888";
          const icon = RISK_ICONS[h.risk_level] || "⚪";
          return (
            <div
              key={h.area_id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-border/30"
            >
              <span className="text-xs">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {h.neighborhood}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {h.category} · {h.trend_direction}
                </div>
              </div>
              <div
                className="text-xs font-bold tabular-nums"
                style={{ color }}
              >
                {Math.round(h.hotspot_score)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
