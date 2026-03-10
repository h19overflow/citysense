/**
 * Misinformation analyzer — calls backend /api/misinfo/analyze endpoint.
 * The backend proxies the Gemini API, keeping the API key server-side.
 * Falls back gracefully when the backend endpoint is unavailable.
 */

export interface AiMisinfoScore {
  articleId: string;
  risk: number;   // 0–100
  reason: string;
}

export class GeminiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

interface ArticleBatchItem {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  category: string;
}

const BATCH_SIZE = 40;

async function callBackendMisinfo(
  batch: ArticleBatchItem[],
  signal?: AbortSignal,
): Promise<AiMisinfoScore[]> {
  const res = await fetch("/api/misinfo/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articles: batch }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GeminiError(`Misinfo API ${res.status}: ${text.slice(0, 200)}`, res.status);
  }

  const data = await res.json();
  return data.results ?? [];
}

/** Analyze articles in batches; returns all scores when done. */
export async function analyzeArticlesBatch(
  articles: ArticleBatchItem[],
  signal?: AbortSignal,
): Promise<AiMisinfoScore[]> {
  const scores: AiMisinfoScore[] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchScores = await callBackendMisinfo(batch, signal);
    scores.push(...batchScores);
  }
  return scores;
}
