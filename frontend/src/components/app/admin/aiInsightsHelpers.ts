export interface ArticleAnalysis {
  article_id: string;
  article_sentiment: "positive" | "neutral" | "negative";
  admin_summary: string;
  topic_clusters: string[];
  urgent_concerns: string[];
  comments: { comment_id: string; sentiment: string }[];
}

export interface AnalysisResults {
  articles: ArticleAnalysis[];
}

export interface RankedItem {
  label: string;
  count: number;
}

export interface AggregatedInsights {
  topConcern: string;
  trendingTopic: string;
  keySentiment: string;
  topicClusters: RankedItem[];
  urgentConcerns: RankedItem[];
}

export type FetchState = "loading" | "empty" | "ready" | "error";

const MAX_TOPICS = 12;
const MAX_CONCERNS = 8;

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(text: string): Set<string> {
  const stopWords = new Set(["the", "a", "an", "in", "of", "and", "for", "on", "at", "to", "with", "is", "are", "was", "were"]);
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w)),
  );
}

function computeTokenOverlap(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) shared++;
  }
  return shared / Math.min(tokensA.size, tokensB.size);
}

function deduplicateAndRank(items: string[], maxResults: number): RankedItem[] {
  const normalized = items.map((item) => ({
    original: item.trim(),
    key: normalizeText(item),
    tokens: tokenize(item),
  }));

  const groups = new Map<string, { label: string; count: number; tokens: Set<string> }>();
  for (const item of normalized) {
    const existing = groups.get(item.key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(item.key, { label: item.original, count: 1, tokens: item.tokens });
    }
  }

  const entries = [...groups.values()].sort((a, b) => b.count - a.count);
  const merged: { label: string; count: number; tokens: Set<string> }[] = [];
  for (const entry of entries) {
    let wasMerged = false;
    for (const target of merged) {
      if (computeTokenOverlap(entry.tokens, target.tokens) > 0.6) {
        target.count += entry.count;
        wasMerged = true;
        break;
      }
    }
    if (!wasMerged) merged.push({ ...entry });
  }

  return merged
    .sort((a, b) => b.count - a.count)
    .slice(0, maxResults)
    .map(({ label, count }) => ({ label, count }));
}

export function aggregateInsights(results: AnalysisResults): AggregatedInsights {
  const allConcerns = results.articles.flatMap((a) => a.urgent_concerns);
  const allTopics = results.articles.flatMap((a) => a.topic_clusters);

  const topicClusters = deduplicateAndRank(allTopics, MAX_TOPICS);
  const urgentConcerns = deduplicateAndRank(allConcerns, MAX_CONCERNS);

  const topConcern = urgentConcerns[0]?.label ?? "No concerns flagged";
  const trendingTopic = topicClusters[0]?.label ?? "No topics yet";
  const negativePct = Math.round(
    (results.articles.filter((a) => a.article_sentiment === "negative").length / Math.max(results.articles.length, 1)) * 100,
  );
  const keySentiment = `${negativePct}% of stories have negative reactions this week`;

  return { topConcern, trendingTopic, keySentiment, topicClusters, urgentConcerns };
}

export async function fetchAnalysisResults(apiBase: string): Promise<AnalysisResults | null> {
  const response = await fetch(`${apiBase}/api/analysis/results`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load results: ${response.status}`);
  return response.json();
}
