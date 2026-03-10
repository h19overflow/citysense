import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NeighborhoodActivity } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface HotSpotsPanelProps {
  neighborhoods: NeighborhoodActivity[];
  onAskAI?: (question: string) => void;
}

function computeEngagementTotal(hood: NeighborhoodActivity): number {
  return hood.reactionCount + hood.commentCount * 3;
}

function buildEngagementBarWidth(engagement: number, maxEngagement: number): string {
  if (maxEngagement === 0) return "0%";
  return `${Math.round((engagement / maxEngagement) * 100)}%`;
}

function NeighborhoodBar({ neighborhood, maxEngagement, onAskAI }: { neighborhood: NeighborhoodActivity; maxEngagement: number; onAskAI?: (q: string) => void }) {
  const engagement = computeEngagementTotal(neighborhood);
  const barWidth = buildEngagementBarWidth(engagement, maxEngagement);
  const sentimentColor = getSentimentColor(neighborhood.topSentiment);
  return (
    <li className="space-y-1">
      <button
        onClick={() => onAskAI?.(`What's happening in ${neighborhood.name}? Summarize the articles and citizen sentiment there.`)}
        className="w-full flex items-center justify-between text-left hover:text-primary transition-colors group"
      >
        <span className="text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          {neighborhood.name}
          <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </span>
        <span className="text-xs text-muted-foreground">{neighborhood.articleCount} articles · {neighborhood.reactionCount} reactions</span>
      </button>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: barWidth, backgroundColor: sentimentColor }} />
      </div>
    </li>
  );
}

function TopThreeList({ neighborhoods, onAskAI }: { neighborhoods: NeighborhoodActivity[]; onAskAI?: (q: string) => void }) {
  if (neighborhoods.length === 0) return <p className="text-sm text-muted-foreground">No neighborhood data yet.</p>;
  const RANK_SUFFIXES = ["1st", "2nd", "3rd"];
  return (
    <ul className="space-y-1.5">
      {neighborhoods.slice(0, 3).map((hood, index) => (
        <li key={hood.name}>
          <button
            onClick={() => onAskAI?.(`What's happening in ${hood.name}? Give me the key articles and citizen mood.`)}
            className="w-full flex items-center gap-2 text-left hover:text-primary transition-colors group"
          >
            <span className="text-xs font-bold text-muted-foreground w-7 shrink-0">{RANK_SUFFIXES[index]}</span>
            <span className="text-sm text-foreground flex-1 group-hover:text-primary transition-colors flex items-center gap-1">
              {hood.name}
              <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </span>
            <span className="text-xs text-muted-foreground">{computeEngagementTotal(hood)} activity</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function HotSpotsPanel({ neighborhoods, onAskAI }: HotSpotsPanelProps) {
  const ranked = neighborhoods.slice(0, 8);
  const maxEngagement = Math.max(...ranked.map(computeEngagementTotal), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most Active Areas</CardTitle>
      </CardHeader>
      <CardContent>
        <TopThreeList neighborhoods={ranked} onAskAI={onAskAI} />
        <CollapsibleSection title="All Areas" defaultOpen={false}>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {ranked.map((hood) => (
                <NeighborhoodBar key={hood.name} neighborhood={hood} maxEngagement={maxEngagement} onAskAI={onAskAI} />
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
