import type { NewsComment, NewsArticle, ReactionType } from "./types";

const STORAGE_KEY = "montgomery-news-comments";

export function loadStoredComments(): NewsComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NewsComment[];
  } catch {
    return [];
  }
}

export function saveComment(comment: NewsComment): void {
  try {
    const existing = loadStoredComments();
    existing.push(comment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function saveAllComments(comments: NewsComment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

interface ExportData {
  comments: NewsComment[];
  reactions: Record<string, Record<ReactionType, number>>;
  articles: { id: string; title: string; category: string; sentiment?: string }[];
  exportedAt: string;
}

export function exportCommentsAsJson(
  comments: NewsComment[],
  reactions: Record<string, Record<ReactionType, number>>,
  articles: NewsArticle[],
): void {
  const data: ExportData = {
    comments,
    reactions,
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      sentiment: a.sentiment,
    })),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `montgomery-news-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
