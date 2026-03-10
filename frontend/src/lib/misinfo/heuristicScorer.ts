/**
 * Instant, zero-API heuristic misinformation scorer.
 * Runs synchronously so cards are scored even before the OpenAI call returns.
 */

export interface HeuristicScore {
  risk: number;   // 0–100
  reason: string;
}

const TRUSTED_FRAGMENTS = [
  "montgomeryadvertiser", "wsfa", "waka", "al.com", "alreporter",
  "montgomerychamber", "montgomeryindependent", "montgomeryal",
  "wsfa12", "justice.gov", "alabama.gov", ".gov",
];

function isTrustedSource(source: string): boolean {
  const s = source.toLowerCase();
  return TRUSTED_FRAGMENTS.some((f) => s.includes(f));
}

const SENSATIONAL: RegExp[] = [
  /\b(shocking|exposed|revealed|cover[- ]?up|conspiracy|hoax|bombshell|scandal)\b/i,
  /you won'?t believe/i,
  /they don'?t want you to know/i,
  /\?\?\?|!!!|!!/,
  /\b(URGENT|ALERT|WARNING)\b/,
];

function hasSensationalLanguage(text: string): boolean {
  return SENSATIONAL.some((p) => p.test(text));
}

function countAllCapsWords(title: string): number {
  return title
    .split(/\s+/)
    .filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w))
    .length;
}

export function scoreHeuristic(article: {
  title: string;
  excerpt: string;
  source: string;
}): HeuristicScore {
  let risk = 0;
  const reasons: string[] = [];

  if (!isTrustedSource(article.source)) {
    risk += 30;
    reasons.push("Unverified or unknown source");
  }

  const capsWords = countAllCapsWords(article.title);
  if (capsWords > 2) {
    risk += 20;
    reasons.push("Excessive all-caps language in headline");
  }

  if (
    hasSensationalLanguage(article.title) ||
    hasSensationalLanguage(article.excerpt)
  ) {
    risk += 20;
    reasons.push("Sensational or alarmist language detected");
  }

  const excerptTooShort =
    !article.excerpt || article.excerpt.trim().length < 25;
  if (excerptTooShort) {
    risk += 10;
    reasons.push("No supporting context in excerpt");
  }

  return {
    risk: Math.min(risk, 100),
    reason:
      reasons.length > 0
        ? reasons.join(". ")
        : "No obvious risk signals detected",
  };
}
