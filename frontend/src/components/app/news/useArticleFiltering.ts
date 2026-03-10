import { useMemo, useState } from "react";
import { filterArticlesByCategory } from "@/lib/newsService";
import { filterBySearch, sortArticles } from "./newsletterHelpers";
import { filterBySource, filterBySentiment, buildUniqueSources } from "./newsViewHelpers";
import type { NewsArticle, NewsCategory, NewsComment } from "@/lib/types";
import type { SortMode } from "./newsletterHelpers";


interface ArticleFilteringState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  sentimentFilter: "" | "positive" | "negative" | "neutral";
  setSentimentFilter: (sentiment: "" | "positive" | "negative" | "neutral") => void;
  clearFilters: () => void;
  visibleArticles: NewsArticle[];
  uniqueSources: string[];
  liveCommentCounts: Map<string, number>;
  hasActiveFilters: boolean;
}

export function useArticleFiltering(
  articles: NewsArticle[],
  activeCategory: NewsCategory,
  comments: NewsComment[],
): ArticleFilteringState {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"" | "positive" | "negative" | "neutral">("");

  function clearFilters() {
    setSearchQuery("");
    setSourceFilter("");
    setSentimentFilter("");
  }

  const uniqueSources = useMemo(() => buildUniqueSources(articles), [articles]);

  const liveCommentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of comments) {
      counts.set(c.articleId, (counts.get(c.articleId) ?? 0) + 1);
    }
    return counts;
  }, [comments]);

  const visibleArticles = useMemo(() => {
    const afterCategory = filterArticlesByCategory(articles, activeCategory);
    const afterSentiment = filterBySentiment(afterCategory, sentimentFilter);
    const afterSource = filterBySource(afterSentiment, sourceFilter);
    const afterSearch = filterBySearch(afterSource, searchQuery);
    return sortArticles(afterSearch, sortMode, comments);
  }, [articles, activeCategory, sentimentFilter, sourceFilter, searchQuery, sortMode, comments]);

  const hasActiveFilters = Boolean(searchQuery || sourceFilter || sentimentFilter);

  return {
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    sourceFilter,
    setSourceFilter,
    sentimentFilter,
    setSentimentFilter,
    clearFilters,
    visibleArticles,
    uniqueSources,
    liveCommentCounts,
    hasActiveFilters,
  };
}
