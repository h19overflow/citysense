import { useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportCommentsAsJson } from "@/lib/newsCommentStore";
import type { NewsArticle, NewsComment, ReactionType } from "@/lib/types";

interface ExportControlsProps {
  comments: NewsComment[];
  reactions: Record<string, Record<ReactionType, number>>;
  articles: NewsArticle[];
}

export function ExportControls({ comments, reactions, articles }: ExportControlsProps) {
  const [lastExportedAt, setLastExportedAt] = useState<Date | null>(null);

  function handleExportJson(): void {
    exportCommentsAsJson(comments, reactions, articles);
    setLastExportedAt(new Date());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download all comments, reactions, and article metadata as a JSON file for offline analysis.
        </p>
        <button
          onClick={handleExportJson}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export Data (JSON)
        </button>
        {lastExportedAt && (
          <p className="text-xs text-muted-foreground">
            Last exported at {lastExportedAt.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
