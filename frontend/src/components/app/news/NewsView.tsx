import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles } from "@/lib/newsService";
import { NewsCard } from "./NewsCard";
import { NewsDetail } from "./NewsDetail";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import { NewsFilterBar } from "./NewsFilterBar";
import { buildArticleCountsPerCategory } from "./newsletterHelpers";
import { formatLastScrapedTimestamp } from "./newsViewHelpers";
import { useArticleFiltering } from "./useArticleFiltering";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import { Newspaper } from "lucide-react";


function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}


export function NewsView() {
  const { state, dispatch } = useApp();
  const [lastScraped, setLastScraped] = useState<string | null>(null);

  const {
    searchQuery, setSearchQuery,
    sortMode, setSortMode,
    sourceFilter, setSourceFilter,
    sentimentFilter, setSentimentFilter,
    clearFilters,
    visibleArticles,
    uniqueSources,
    liveCommentCounts,
    hasActiveFilters,
  } = useArticleFiltering(state.newsArticles, state.newsCategory, state.newsComments);

  const loadArticles = useCallback(async () => {
    dispatch({ type: "SET_NEWS_LOADING", loading: true });
    try {
      const articles = await fetchNewsArticles();
      dispatch({ type: "SET_NEWS_ARTICLES", articles });

      if (!lastScraped) {
        const response = await fetch("/data/news_feed.json");
        const data = await response.json();
        if (data.lastScraped) setLastScraped(data.lastScraped);
      }
    } catch (error) {
      console.error("[NewsView] Failed to load news articles", error);
    } finally {
      dispatch({ type: "SET_NEWS_LOADING", loading: false });
    }
  }, [lastScraped, dispatch]);

  useEffect(() => { loadArticles(); }, []);

  const handleCategoryChange = useCallback((category: NewsCategory) => {
    dispatch({ type: "SET_NEWS_CATEGORY", category });
  }, [dispatch]);

  const handleSelectArticle = useCallback((article: NewsArticle) => {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: article.id });
  }, [dispatch]);

  const handleBackToFeed = useCallback(() => {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
  }, [dispatch]);

  const handleReact = useCallback((articleId: string, emoji: string | null) => {
    if (emoji === null) {
      const current = state.articleReactions[articleId];
      if (current) dispatch({ type: "SET_EMOJI_REACTION", articleId, emoji: current });
    } else {
      dispatch({ type: "SET_EMOJI_REACTION", articleId, emoji });
    }
  }, [dispatch, state.articleReactions]);

  const handleFlag = useCallback((articleId: string) => {
    dispatch({ type: "TOGGLE_ARTICLE_FLAG", articleId });
  }, [dispatch]);

  const selectedArticle = useMemo(
    () => state.selectedArticleId ? state.newsArticles.find((a) => a.id === state.selectedArticleId) ?? null : null,
    [state.selectedArticleId, state.newsArticles]
  );

  const articleCounts = useMemo(
    () => buildArticleCountsPerCategory(state.newsArticles),
    [state.newsArticles]
  );

  if (selectedArticle) {
    return (
      <NewsDetail
        article={selectedArticle}
        userReaction={state.articleReactions[selectedArticle.id] ?? null}
        isFlagged={state.flaggedArticleIds.includes(selectedArticle.id)}
        onBack={handleBackToFeed}
        onReact={handleReact}
        onFlag={handleFlag}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-background shadow-sm px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Montgomery News</h2>
          </div>
          {lastScraped && (
            <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
              Updated {formatLastScrapedTimestamp(lastScraped)}
            </span>
          )}
        </div>

        <NewsCategoryTabs
          activeCategory={state.newsCategory}
          onCategoryChange={handleCategoryChange}
          articleCounts={articleCounts}
        />

        <NewsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortMode={sortMode}
          onSortChange={setSortMode}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          uniqueSources={uniqueSources}
          sentimentFilter={sentimentFilter}
          onSentimentChange={setSentimentFilter}
        />
      </div>

      {/* Results count */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-muted/20 border-b border-border/30">
        <span className="text-xs text-muted-foreground">
          {visibleArticles.length} article{visibleArticles.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
          {sourceFilter && ` from ${sourceFilter}`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-primary hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.newsLoading && state.newsArticles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Newspaper className="w-8 h-8 opacity-30" />
            <p className="text-sm">No articles match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleArticles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                reactionCounts={article.reactionCounts ?? {}}
                userReaction={state.articleReactions[article.id] ?? null}
                flagCount={article.flagCount ?? 0}
                isFlagged={state.flaggedArticleIds.includes(article.id)}
                commentCount={article.commentCount + (liveCommentCounts.get(article.id) ?? 0)}
                onSelect={handleSelectArticle}
                onReact={handleReact}
                onFlag={handleFlag}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
