import type { NewsArticle, NewsComment, ReactionType, NeighborhoodActivity } from "./types";

export function sortArticlesByEngagement(
  articles: NewsArticle[],
  reactions: Record<string, Record<ReactionType, number>>,
  comments: NewsComment[],
): NewsArticle[] {
  const commentCountByArticle = new Map<string, number>();
  for (const c of comments) {
    commentCountByArticle.set(c.articleId, (commentCountByArticle.get(c.articleId) ?? 0) + 1);
  }

  return [...articles].sort((a, b) => {
    const scoreA = computeEngagementScore(a.id, reactions, commentCountByArticle) + a.upvotes + a.commentCount;
    const scoreB = computeEngagementScore(b.id, reactions, commentCountByArticle) + b.upvotes + b.commentCount;
    return scoreB - scoreA;
  });
}

function computeEngagementScore(
  articleId: string,
  reactions: Record<string, Record<ReactionType, number>>,
  commentCounts: Map<string, number>,
): number {
  const reactionTotal = Object.values(reactions[articleId] ?? {}).reduce((sum, n) => sum + n, 0);
  const commentTotal = commentCounts.get(articleId) ?? 0;
  return reactionTotal * 1 + commentTotal * 3;
}

export function groupArticlesByNeighborhood(articles: NewsArticle[]): Map<string, NewsArticle[]> {
  const map = new Map<string, NewsArticle[]>();
  for (const article of articles) {
    const name = article.location?.neighborhood ?? "Unknown";
    const existing = map.get(name) ?? [];
    existing.push(article);
    map.set(name, existing);
  }
  return map;
}

export function computeNeighborhoodActivity(
  articles: NewsArticle[],
  reactions: Record<string, Record<ReactionType, number>>,
  comments: NewsComment[],
): NeighborhoodActivity[] {
  const grouped = groupArticlesByNeighborhood(articles);
  const commentsByArticle = new Map<string, number>();
  for (const c of comments) {
    commentsByArticle.set(c.articleId, (commentsByArticle.get(c.articleId) ?? 0) + 1);
  }

  const results: NeighborhoodActivity[] = [];
  for (const [name, neighborhoodArticles] of grouped) {
    let reactionCount = 0;
    let commentCount = 0;
    let latSum = 0;
    let lngSum = 0;
    let geoCount = 0;

    for (const a of neighborhoodArticles) {
      reactionCount += Object.values(reactions[a.id] ?? {}).reduce((sum, n) => sum + n, 0);
      commentCount += commentsByArticle.get(a.id) ?? 0;
      if (a.location) {
        latSum += a.location.lat;
        lngSum += a.location.lng;
        geoCount++;
      }
    }

    const topSentiment = computeDominantSentiment(neighborhoodArticles);

    results.push({
      name,
      articleCount: neighborhoodArticles.length,
      reactionCount,
      commentCount,
      topSentiment,
      centerLat: geoCount > 0 ? latSum / geoCount : 0,
      centerLng: geoCount > 0 ? lngSum / geoCount : 0,
    });
  }

  return results.sort((a, b) => {
    const actA = a.reactionCount + a.commentCount * 3;
    const actB = b.reactionCount + b.commentCount * 3;
    return actB - actA;
  });
}

function computeDominantSentiment(articles: NewsArticle[]): "positive" | "neutral" | "negative" {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const a of articles) {
    const s = a.sentiment ?? "neutral";
    counts[s]++;
  }
  if (counts.positive >= counts.neutral && counts.positive >= counts.negative) return "positive";
  if (counts.negative >= counts.neutral) return "negative";
  return "neutral";
}

export function computeSentimentBreakdown(
  articles: NewsArticle[],
): { positive: number; neutral: number; negative: number } {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const a of articles) {
    const s = a.sentiment ?? "neutral";
    counts[s]++;
  }
  return counts;
}

export function findTopConcerns(
  articles: NewsArticle[],
  comments: NewsComment[],
): { title: string; commentCount: number; articleId: string }[] {
  const commentCounts = new Map<string, number>();
  for (const c of comments) {
    commentCounts.set(c.articleId, (commentCounts.get(c.articleId) ?? 0) + 1);
  }

  const articleMap = new Map(articles.map((a) => [a.id, a]));

  return [...commentCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([articleId, count]) => ({
      title: articleMap.get(articleId)?.title ?? "Unknown article",
      commentCount: count,
      articleId,
    }));
}
