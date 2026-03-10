import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { computeNeighborhoodActivity } from "@/lib/newsAggregations";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NewsArticle, NewsComment, NeighborhoodActivity, ReactionType } from "@/lib/types";

interface NeighborhoodsTabProps {
  articles: NewsArticle[];
  reactionCounts: Record<string, Record<ReactionType, number>>;
  comments: NewsComment[];
  onZoomToNeighborhood: (lat: number, lng: number) => void;
}

function computeMaxActivityLevel(neighborhoods: NeighborhoodActivity[]): number {
  if (neighborhoods.length === 0) return 1;
  return Math.max(...neighborhoods.map((n) => n.reactionCount + n.commentCount * 3));
}

function computeActivityLevel(neighborhood: NeighborhoodActivity): number {
  return neighborhood.reactionCount + neighborhood.commentCount * 3;
}

function computeBarWidthPercent(neighborhood: NeighborhoodActivity, maxActivity: number): number {
  if (maxActivity === 0) return 0;
  return Math.round((computeActivityLevel(neighborhood) / maxActivity) * 100);
}

function NeighborhoodRow({
  neighborhood,
  barWidthPercent,
  onZoom,
}: {
  neighborhood: NeighborhoodActivity;
  barWidthPercent: number;
  onZoom: () => void;
}) {
  const barColor = getSentimentColor(neighborhood.topSentiment);
  const canZoom = neighborhood.centerLat !== 0 || neighborhood.centerLng !== 0;

  return (
    <button
      onClick={canZoom ? onZoom : undefined}
      disabled={!canZoom}
      className="w-full text-left px-4 py-3 min-h-[56px] flex flex-col gap-1.5 hover:bg-muted/30 transition-colors disabled:cursor-default border-b border-border/20 last:border-0"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground leading-tight truncate">{neighborhood.name}</span>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {neighborhood.articleCount} articles
        </Badge>
      </div>

      <div className="w-full bg-muted/30 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${barWidthPercent}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{neighborhood.reactionCount} reactions</span>
        <span>{neighborhood.commentCount} comments</span>
        <span className="capitalize">{neighborhood.topSentiment} sentiment</span>
      </div>
    </button>
  );
}

export function NeighborhoodsTab({ articles, reactionCounts, comments, onZoomToNeighborhood }: NeighborhoodsTabProps) {
  const neighborhoods = computeNeighborhoodActivity(articles, reactionCounts, comments);
  const maxActivity = computeMaxActivityLevel(neighborhoods);

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      {neighborhoods.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 px-4">
          No neighborhood data available yet.
        </p>
      ) : (
        neighborhoods.map((neighborhood) => (
          <NeighborhoodRow
            key={neighborhood.name}
            neighborhood={neighborhood}
            barWidthPercent={computeBarWidthPercent(neighborhood, maxActivity)}
            onZoom={() => onZoomToNeighborhood(neighborhood.centerLat, neighborhood.centerLng)}
          />
        ))
      )}
    </ScrollArea>
  );
}
