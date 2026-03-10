import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchHotspots, fetchTrends } from "@/lib/predictiveService";
import type { PredictionHotspot, PredictionTrend } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface PredictiveHeatmapPanelProps {
  onAskAI?: (question: string) => void;
}

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

const TREND_ICONS: Record<string, string> = {
  rising: "📈",
  falling: "📉",
  stable: "➡️",
};

function HotspotRow({ hotspot, onAskAI }: { hotspot: PredictionHotspot; onAskAI?: (q: string) => void }) {
  const color = RISK_COLORS[hotspot.risk_level] || "#888";
  const icon = RISK_ICONS[hotspot.risk_level] || "⚪";

  return (
    <button
      onClick={() => onAskAI?.(`Tell me about the ${hotspot.risk_level} risk hotspot in ${hotspot.neighborhood} for ${hotspot.category}. What's driving the score of ${Math.round(hotspot.hotspot_score)} and what should we do about it?`)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
    >
      <span className="text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate flex items-center gap-1">
          {hotspot.neighborhood}
          <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </div>
        <div className="text-xs text-muted-foreground">
          {hotspot.category} · {hotspot.trend_direction}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold tabular-nums" style={{ color }}>
          {Math.round(hotspot.hotspot_score)}
        </div>
        <div
          className="text-[10px] font-semibold uppercase"
          style={{ color }}
        >
          {hotspot.risk_level}
        </div>
      </div>
    </button>
  );
}

function TrendRow({ trend, onAskAI }: { trend: PredictionTrend; onAskAI?: (q: string) => void }) {
  const icon = TREND_ICONS[trend.trend_direction] || "➡️";
  const growthPercent = Math.round(trend.growth_rate * 100);
  const growthColor = trend.growth_rate > 0 ? "#dc2626" : trend.growth_rate < 0 ? "#16a34a" : "#888";

  return (
    <button
      onClick={() => onAskAI?.(`What's happening with ${trend.category} complaints? They're ${trend.trend_direction} at ${growthPercent > 0 ? "+" : ""}${growthPercent}%. Which neighborhoods are most affected and what should we do?`)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
    >
      <span className="text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground capitalize flex items-center gap-1">
          {trend.category}
          <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {trend.top_neighborhoods.slice(0, 3).join(", ")}
        </div>
      </div>
      <div className="text-sm font-bold tabular-nums" style={{ color: growthColor }}>
        {growthPercent > 0 ? "+" : ""}{growthPercent}%
      </div>
    </button>
  );
}

export function PredictiveHeatmapPanel({ onAskAI }: PredictiveHeatmapPanelProps) {
  const [hotspots, setHotspots] = useState<PredictionHotspot[]>([]);
  const [trends, setTrends] = useState<PredictionTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchHotspots(), fetchTrends()]).then(([hotspotsData, trendsData]) => {
      if (hotspotsData) setHotspots(hotspotsData.hotspots);
      if (trendsData) setTrends(trendsData.trends);
      setLoading(false);
    });
  }, []);

  const criticalCount = hotspots.filter((h) => h.risk_level === "critical").length;
  const highCount = hotspots.filter((h) => h.risk_level === "high").length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Areas to Watch
          {criticalCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {highCount} high
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : hotspots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hotspot data available.</p>
          ) : (
            <>
              <div className="space-y-2">
                {hotspots.slice(0, 5).map((h) => (
                  <HotspotRow key={h.area_id} hotspot={h} onAskAI={onAskAI} />
                ))}
              </div>

              {hotspots.length > 5 && (
                <CollapsibleSection title={`All Hotspots (${hotspots.length})`} defaultOpen={false}>
                  <div className="space-y-2">
                    {hotspots.slice(5).map((h) => (
                      <HotspotRow key={h.area_id} hotspot={h} onAskAI={onAskAI} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {trends.length > 0 && (
                <CollapsibleSection title="What's Changing" defaultOpen={false}>
                  <div className="space-y-2">
                    {trends.map((t) => (
                      <TrendRow key={t.category} trend={t} onAskAI={onAskAI} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
