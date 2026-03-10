import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANALYSIS_API_BASE } from "@/lib/apiConfig";
import { fetchAnalysisResults, aggregateInsights } from "./aiInsightsHelpers";
import type { AggregatedInsights, FetchState } from "./aiInsightsHelpers";
import { InsightsDetails } from "./InsightsDetails";

interface AIInsightsCardProps {
  refreshTrigger?: number;
  onAskAI?: (question: string) => void;
}

export function AIInsightsCard({ refreshTrigger = 0, onAskAI }: AIInsightsCardProps) {
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [insights, setInsights] = useState<AggregatedInsights | null>(null);

  useEffect(() => {
    setFetchState("loading");
    fetchAnalysisResults(ANALYSIS_API_BASE)
      .then((data) => {
        setInsights(data ? aggregateInsights(data) : null);
        setFetchState(data ? "ready" : "empty");
      })
      .catch((error) => {
        console.error("[AIInsightsCard] Failed to fetch analysis results:", error);
        setFetchState("error");
      });
  }, [refreshTrigger]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Key Takeaways</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
          {fetchState === "loading" && <p className="text-sm text-muted-foreground animate-pulse">Loading insights…</p>}
          {fetchState === "empty" && <p className="text-sm text-muted-foreground">No analysis yet. Run Analysis to generate insights.</p>}
          {fetchState === "error" && <p className="text-sm text-destructive">Failed to load. Check that the backend is running.</p>}
          {fetchState === "ready" && insights && (
            <InsightsDetails insights={insights} onAskAI={onAskAI} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
