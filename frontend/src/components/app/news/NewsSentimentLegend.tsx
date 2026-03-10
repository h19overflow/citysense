import type { NewsArticle, ReactionType } from "@/lib/types";
import { getSentimentColor } from "@/lib/newsMapMarkers";

interface NewsSentimentLegendProps {
  articles: NewsArticle[];
  reactionCounts: Record<string, Record<ReactionType, number>>;
  mode: "pins" | "heat";
  onModeChange: (mode: "pins" | "heat") => void;
}

function countBySentiment(articles: NewsArticle[]): Record<string, number> {
  const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const a of articles) {
    const key = a.sentiment ?? "neutral";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function aggregateReactions(
  reactionCounts: Record<string, Record<ReactionType, number>>,
): Record<ReactionType, number> {
  const totals: Record<string, number> = {};
  for (const articleReactions of Object.values(reactionCounts)) {
    for (const [type, count] of Object.entries(articleReactions)) {
      totals[type] = (totals[type] ?? 0) + count;
    }
  }
  return totals as Record<ReactionType, number>;
}

export function NewsSentimentLegend({ articles, reactionCounts, mode, onModeChange }: NewsSentimentLegendProps) {
  const sentimentCounts = countBySentiment(articles);
  const totalReactions = aggregateReactions(reactionCounts);
  const topReaction = Object.entries(totalReactions).sort(([, a], [, b]) => b - a)[0];

  const REACTION_EMOJIS: Record<string, string> = {
    thumbs_up: "👍", thumbs_down: "👎", heart: "❤️", sad: "😢", angry: "😡",
  };

  return (
    <div className="absolute bottom-3 right-3 bg-card/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg z-[1000] max-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">News Pulse</span>
        <div className="flex gap-1">
          <button
            onClick={() => onModeChange("pins")}
            className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
              mode === "pins" ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Pins
          </button>
          <button
            onClick={() => onModeChange("heat")}
            className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
              mode === "heat" ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Heat
          </button>
        </div>
      </div>

      {/* Sentiment scale */}
      <div className="space-y-1 mb-3">
        {(["positive", "neutral", "negative"] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getSentimentColor(s) }}
            />
            <span className="text-[10px] text-muted-foreground capitalize flex-1">{s}</span>
            <span className="text-[10px] font-semibold text-foreground">{sentimentCounts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Community pulse */}
      {topReaction && topReaction[1] > 0 && (
        <div className="pt-2 border-t border-border/30">
          <div className="text-[10px] text-muted-foreground mb-1">Community pulse</div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{REACTION_EMOJIS[topReaction[0]] ?? "👍"}</span>
            <span className="text-[10px] font-medium text-foreground">
              Most common reaction ({topReaction[1]})
            </span>
          </div>
        </div>
      )}

      <div className="text-[9px] text-muted-foreground/60 mt-2">
        {articles.length} stories on map
      </div>
    </div>
  );
}
