import type { NewsArticle } from "@/lib/types";


export function formatLastScrapedTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function filterBySource(articles: NewsArticle[], source: string): NewsArticle[] {
  if (!source) return articles;
  return articles.filter((a) => a.source === source);
}

export function filterBySentiment(
  articles: NewsArticle[],
  sentiment: string,
): NewsArticle[] {
  if (!sentiment) return articles;
  return articles.filter((a) => a.sentiment === sentiment);
}

export function buildUniqueSources(articles: NewsArticle[]): string[] {
  const sources = new Set(articles.map((a) => a.source).filter(Boolean));
  return [...sources].sort();
}
