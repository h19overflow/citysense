import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingArticleItem } from "./TrendingArticleItem";
import { sortArticlesByEngagement } from "@/lib/newsAggregations";
import type { NewsArticle, NewsComment, NewsCategory, ReactionType } from "@/lib/types";

type SentimentFilter = "all" | "positive" | "neutral" | "negative";

const CATEGORY_OPTIONS: { value: NewsCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "development", label: "Development" },
  { value: "government", label: "Government" },
  { value: "community", label: "Community" },
  { value: "events", label: "Events" },
];

const SENTIMENT_OPTIONS: { value: SentimentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

interface TrendingTabProps {
  articles: NewsArticle[];
  reactionCounts: Record<string, Record<ReactionType, number>>;
  comments: NewsComment[];
  onSelectArticle: (articleId: string) => void;
}

function filterByCategory(articles: NewsArticle[], category: NewsCategory | "all"): NewsArticle[] {
  if (category === "all") return articles;
  return articles.filter((a) => a.category === category);
}

function filterBySentiment(articles: NewsArticle[], sentiment: SentimentFilter): NewsArticle[] {
  if (sentiment === "all") return articles;
  return articles.filter((a) => (a.sentiment ?? "neutral") === sentiment);
}

export function TrendingTab({ articles, reactionCounts, comments, onSelectArticle }: TrendingTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "all">("all");
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentFilter>("all");

  const filteredArticles = filterBySentiment(
    filterByCategory(articles, selectedCategory),
    selectedSentiment,
  );
  const sortedArticles = sortArticlesByEngagement(filteredArticles, reactionCounts, comments);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-3 pt-3 pb-1 flex flex-wrap gap-1">
        {CATEGORY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSelectedCategory(value as NewsCategory | "all")}
            className={`min-h-[44px] px-3 py-1 text-sm rounded-lg transition-colors font-medium ${
              selectedCategory === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-foreground hover:bg-muted/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="shrink-0 px-3 pb-2 flex flex-wrap gap-1">
        {SENTIMENT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSelectedSentiment(value)}
            className={`min-h-[44px] px-3 py-1 text-sm rounded-lg transition-colors font-medium ${
              selectedSentiment === value
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted/40 text-foreground hover:bg-muted/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {sortedArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">
            No articles match the selected filters.
          </p>
        ) : (
          sortedArticles.map((article) => (
            <TrendingArticleItem
              key={article.id}
              article={article}
              reactionCounts={reactionCounts[article.id] ?? ({} as Record<ReactionType, number>)}
              comments={comments}
              onSelect={onSelectArticle}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
