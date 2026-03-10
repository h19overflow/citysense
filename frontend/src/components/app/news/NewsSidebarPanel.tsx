import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarArticleRow } from "./SidebarArticleRow";
import { NewsCommentSection } from "./NewsCommentSection";
import { sortArticlesByEngagement } from "@/lib/newsAggregations";
import type { NewsArticle, NewsComment, NewsCategory, ReactionType } from "@/lib/types";

type SortMode = "latest" | "trending";

const CATEGORIES: { value: NewsCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "development", label: "Dev" },
  { value: "government", label: "Gov" },
  { value: "community", label: "Community" },
  { value: "events", label: "Events" },
];

interface NewsSidebarPanelProps {
  articles: NewsArticle[];
  reactionCounts: Record<string, Record<ReactionType, number>>;
  comments: NewsComment[];
  mode: "pins" | "heat";
  onModeChange: (mode: "pins" | "heat") => void;
  onZoomToNeighborhood: (lat: number, lng: number) => void;
  onSelectArticle: (articleId: string) => void;
  focusedArticleId?: string | null;
}

function parseRelativeDate(dateStr: string): number {
  const now = Date.now();
  const match = dateStr.match(/^(\d+)\s+(hour|day|week|month)s?\s+ago$/i);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const ms = { hour: 3600_000, day: 86400_000, week: 604800_000, month: 2592000_000 };
    return now - amount * (ms[unit as keyof typeof ms] ?? 0);
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

function sortByLatest(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => {
    const timeA = parseRelativeDate(a.publishedAt) || new Date(a.scrapedAt).getTime();
    const timeB = parseRelativeDate(b.publishedAt) || new Date(b.scrapedAt).getTime();
    return timeB - timeA;
  });
}

export function NewsSidebarPanel({
  articles, reactionCounts, comments, mode, onModeChange, onSelectArticle, focusedArticleId,
}: NewsSidebarPanelProps) {
  const [sort, setSort] = useState<SortMode>("latest");
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sync externally focused article (e.g. from admin chat) into local selection
  useEffect(() => {
    if (focusedArticleId && focusedArticleId !== selectedId) {
      setSelectedId(focusedArticleId);
    }
  }, [focusedArticleId]);

  const filtered = category === "all" ? articles : articles.filter((a) => a.category === category);
  const sorted = sort === "latest"
    ? sortByLatest(filtered)
    : sortArticlesByEngagement(filtered, reactionCounts, comments);

  function handleSelectArticle(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
      onSelectArticle(id);
    }
  }

  return (
    <div className="absolute top-0 right-0 h-full w-[320px] bg-white shadow-xl z-[1000] flex flex-col border-l border-border/30">
      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/20 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">News Feed</h2>
          <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-md">
            {(["pins", "heat"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors capitalize
                  ${mode === m ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Sort + filter row */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-0.5 bg-muted/30 rounded-md">
            {(["latest", "trending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize
                  ${sort === s ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as NewsCategory | "all")}
            className="text-xs border border-border/50 rounded-md px-2 py-1 bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <span className="ml-auto text-[10px] text-muted-foreground">{sorted.length}</span>
        </div>
      </div>

      {/* Article list */}
      <ScrollArea className="flex-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
            <span className="text-2xl">📭</span>
            <p className="text-sm font-medium text-muted-foreground">No articles found</p>
            <p className="text-xs text-muted-foreground/70">Try a different category</p>
          </div>
        ) : (
          sorted.map((article) => (
            <div key={article.id}>
              <SidebarArticleRow
                article={article}
                reactionCount={Object.values(reactionCounts[article.id] ?? {}).reduce((s, n) => s + n, 0)}
                commentCount={comments.filter((c) => c.articleId === article.id).length}
                isSelected={selectedId === article.id}
                onSelect={() => handleSelectArticle(article.id)}
              />
              {selectedId === article.id && (
                <div className="px-3 pb-3 bg-muted/10 border-b border-border/20">
                  <NewsCommentSection articleId={article.id} />
                </div>
              )}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
