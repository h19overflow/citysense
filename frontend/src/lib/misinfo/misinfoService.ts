/**
 * Orchestrates two-layer misinformation analysis:
 *   1. Heuristic scores  — instant, no API key needed
 *   2. Gemini 2.0 Flash via backend proxy — async, overwrites heuristic when available
 *
 * Each layer calls `onUpdate` so the UI updates progressively.
 */

import { scoreHeuristic } from "./heuristicScorer";
import { analyzeArticlesBatch, GeminiError } from "./geminiAnalyzer";
import type { NewsArticle } from "@/lib/types";

export interface MisinfoScore {
  articleId: string;
  risk: number;
  reason: string;
}

/**
 * Run full analysis pipeline on a list of articles.
 * @param articles  Articles to analyze
 * @param onUpdate  Called immediately with heuristic scores, then again with AI scores
 * @param signal    Optional AbortSignal to cancel the AI layer
 */
export async function runMisinfoAnalysis(
  articles: NewsArticle[],
  onUpdate: (scores: MisinfoScore[]) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Layer 1: heuristics (synchronous, instant)
  const heuristicScores: MisinfoScore[] = articles.map((a) => {
    const { risk, reason } = scoreHeuristic({
      title: a.title,
      excerpt: a.excerpt,
      source: a.source,
    });
    return { articleId: a.id, risk, reason };
  });
  onUpdate(heuristicScores);

  // Layer 2: Gemini 2.0 Flash via backend proxy (async, overwrites heuristic scores)
  try {
    const aiScores = await analyzeArticlesBatch(
      articles.map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        source: a.source,
        category: a.category,
      })),
      signal,
    );
    if (aiScores.length > 0) onUpdate(aiScores);
  } catch (err) {
    if (err instanceof GeminiError) {
      console.warn("[misinfoService] AI analysis unavailable:", err.message);
    } else {
      console.error("[misinfoService] Unexpected error:", err);
    }
    // Heuristic scores remain — no visual disruption
  }
}
