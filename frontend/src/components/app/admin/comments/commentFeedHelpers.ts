import type { NewsArticle, NewsComment } from "@/lib/types";

export type SortMode = "newest" | "by-article" | "by-neighborhood";

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Latest" },
  { value: "by-article", label: "By Story" },
  { value: "by-neighborhood", label: "By Area" },
];

export function buildArticleIndex(articles: NewsArticle[]): Map<string, NewsArticle> {
  return new Map(articles.map((a) => [a.id, a]));
}

export function sortComments(
  comments: NewsComment[],
  mode: SortMode,
  articleIndex: Map<string, NewsArticle>,
): NewsComment[] {
  const copy = [...comments];
  if (mode === "newest") {
    return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (mode === "by-article") {
    return copy.sort((a, b) => a.articleId.localeCompare(b.articleId));
  }
  return copy.sort((a, b) => {
    const na = articleIndex.get(a.articleId)?.location?.neighborhood ?? "";
    const nb = articleIndex.get(b.articleId)?.location?.neighborhood ?? "";
    return na.localeCompare(nb);
  });
}

export function groupCommentsByArticle(
  comments: NewsComment[],
  articleIndex: Map<string, NewsArticle>,
): { article: NewsArticle | undefined; articleId: string; comments: NewsComment[] }[] {
  const groups = new Map<string, NewsComment[]>();
  for (const c of comments) {
    const existing = groups.get(c.articleId) ?? [];
    existing.push(c);
    groups.set(c.articleId, existing);
  }
  return [...groups.entries()]
    .map(([articleId, groupComments]) => ({
      articleId,
      article: articleIndex.get(articleId),
      comments: groupComments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }))
    .sort((a, b) => b.comments.length - a.comments.length);
}

export function groupCommentsByNeighborhood(
  comments: NewsComment[],
  articleIndex: Map<string, NewsArticle>,
): { neighborhood: string; comments: NewsComment[] }[] {
  const groups = new Map<string, NewsComment[]>();
  for (const c of comments) {
    const neighborhood = articleIndex.get(c.articleId)?.location?.neighborhood ?? "Unknown";
    const existing = groups.get(neighborhood) ?? [];
    existing.push(c);
    groups.set(neighborhood, existing);
  }
  return [...groups.entries()]
    .map(([neighborhood, groupComments]) => ({
      neighborhood,
      comments: groupComments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }))
    .sort((a, b) => b.comments.length - a.comments.length);
}
