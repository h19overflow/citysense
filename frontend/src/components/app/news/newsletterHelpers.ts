import { sortArticlesByDate } from "@/lib/newsService";
import type { NewsArticle, NewsComment } from "@/lib/types";

export type SortMode = "newest" | "oldest" | "most_liked" | "most_comments";

export function isArticleLiked(likedIds: string[], articleId: string): boolean {
  if (!likedIds || !Array.isArray(likedIds)) return false;
  return likedIds.includes(articleId);
}

export function buildArticleCountsPerCategory(articles: NewsArticle[]): Record<string, number> {
  const counts: Record<string, number> = { all: articles.length };
  for (const article of articles) {
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }
  return counts;
}

function buildLiveCommentCounts(comments: NewsComment[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of comments) {
    counts.set(c.articleId, (counts.get(c.articleId) ?? 0) + 1);
  }
  return counts;
}

export function sortArticles(articles: NewsArticle[], sortMode: SortMode, comments: NewsComment[] = []): NewsArticle[] {
  if (sortMode === "most_liked") {
    return [...articles].sort((a, b) => b.upvotes - a.upvotes);
  }
  if (sortMode === "most_comments") {
    const liveCounts = buildLiveCommentCounts(comments);
    return [...articles].sort((a, b) => {
      const countA = a.commentCount + (liveCounts.get(a.id) ?? 0);
      const countB = b.commentCount + (liveCounts.get(b.id) ?? 0);
      return countB - countA;
    });
  }
  const sorted = sortArticlesByDate(articles);
  return sortMode === "oldest" ? sorted.reverse() : sorted;
}

export function filterBySearch(articles: NewsArticle[], query: string): NewsArticle[] {
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.source.toLowerCase().includes(q),
  );
}

export function selectHeroArticle(articles: NewsArticle[]): NewsArticle | null {
  if (articles.length === 0) return null;
  const withImage = articles.filter((a) => a.imageUrl && !a.imageUrl.startsWith("data:"));
  if (withImage.length > 0) {
    return withImage.sort((a, b) => (b.upvotes + b.commentCount) - (a.upvotes + a.commentCount))[0];
  }
  return articles[0];
}
