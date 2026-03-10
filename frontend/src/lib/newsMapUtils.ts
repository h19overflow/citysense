import type { NewsArticle, NewsCategory } from "./types";

export interface CategoryMeta {
  key: NewsCategory;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { key: "all", label: "All", emoji: "📰", color: "#6b7280" },
  { key: "general", label: "General", emoji: "📋", color: "#64748b" },
  { key: "development", label: "Development", emoji: "🏗️", color: "#3b82f6" },
  { key: "government", label: "Government", emoji: "🏛️", color: "#f59e0b" },
  { key: "community", label: "Community", emoji: "🤝", color: "#10b981" },
  { key: "events", label: "Events", emoji: "🎉", color: "#8b5cf6" },
];

export const SENTIMENT_LEGEND = [
  { label: "Positive", color: "#22c55e" },
  { label: "Neutral", color: "#eab308" },
  { label: "Negative", color: "#ef4444" },
];

export function getCategoryEmoji(category: string): string {
  return CATEGORY_META.find((c) => c.key === category)?.emoji ?? "📰";
}

export function getCategoryColor(category: string): string {
  return CATEGORY_META.find((c) => c.key === category)?.color ?? "#6b7280";
}

export function getSentimentColor(sentiment: string): string {
  if (sentiment === "positive") return "#22c55e";
  if (sentiment === "negative") return "#ef4444";
  return "#eab308";
}

export function isHighMisinfoRisk(article: NewsArticle): boolean {
  return (article.misinfoRisk ?? 0) > 60;
}

export function filterArticlesByMapCategory(
  articles: NewsArticle[],
  category: NewsCategory,
): NewsArticle[] {
  if (category === "all") return articles;
  return articles.filter((a) => a.category === category);
}

export function filterByMisinfoRisk(
  articles: NewsArticle[],
  showMisinfoOnly: boolean,
): NewsArticle[] {
  if (!showMisinfoOnly) return articles;
  return articles.filter((a) => (a.misinfoRisk ?? 0) > 60);
}
