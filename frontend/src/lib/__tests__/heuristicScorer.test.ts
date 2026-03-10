import { describe, it, expect } from "vitest";
import { scoreHeuristic } from "../misinfo/heuristicScorer";
import type { HeuristicScore } from "../misinfo/heuristicScorer";

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeArticle(overrides: Partial<{ title: string; excerpt: string; source: string }> = {}) {
  return {
    title: "Montgomery City Council Approves New Budget",
    excerpt: "The city council voted unanimously to pass the annual budget plan for fiscal year 2026.",
    source: "wsfa.com",
    ...overrides,
  };
}

// ------------------------------------------------------------------
// scoreHeuristic — positive (clean articles)
// ------------------------------------------------------------------

describe("scoreHeuristic — trusted sources", () => {
  it("assigns risk 0 from source penalty for a .gov domain", () => {
    const result = scoreHeuristic(makeArticle({ source: "alabama.gov" }));
    // No source penalty, clean title and excerpt → lowest possible risk
    expect(result.risk).toBeLessThan(20);
  });

  it("assigns risk 0 from source penalty for wsfa", () => {
    const result = scoreHeuristic(makeArticle({ source: "wsfa12.com" }));
    expect(result.risk).toBeLessThan(20);
  });

  it("returns 'No obvious risk signals detected' reason for a clean article", () => {
    const result = scoreHeuristic(makeArticle());
    expect(result.reason).toBe("No obvious risk signals detected");
  });

  it("returns a risk score between 0 and 100 inclusive", () => {
    const result = scoreHeuristic(makeArticle());
    expect(result.risk).toBeGreaterThanOrEqual(0);
    expect(result.risk).toBeLessThanOrEqual(100);
  });
});

// ------------------------------------------------------------------
// scoreHeuristic — negative (risky signals)
// ------------------------------------------------------------------

describe("scoreHeuristic — untrusted sources", () => {
  it("adds 30 risk points for an unrecognised source domain", () => {
    const result = scoreHeuristic(makeArticle({ source: "randomnewsblog.net" }));
    expect(result.risk).toBeGreaterThanOrEqual(30);
  });

  it("includes 'Unverified or unknown source' in the reason for unknown sources", () => {
    const result = scoreHeuristic(makeArticle({ source: "unknownsource.io" }));
    expect(result.reason).toContain("Unverified or unknown source");
  });
});

describe("scoreHeuristic — sensational language", () => {
  it("adds risk for 'SHOCKING' in the title", () => {
    const clean = scoreHeuristic(makeArticle());
    const sensational = scoreHeuristic(makeArticle({ title: "SHOCKING news about local official", source: "wsfa.com" }));
    expect(sensational.risk).toBeGreaterThan(clean.risk);
  });

  it("adds risk for sensational language in the excerpt", () => {
    const result = scoreHeuristic(
      makeArticle({ excerpt: "You won't believe what the mayor did next", source: "wsfa.com" })
    );
    expect(result.reason).toContain("Sensational or alarmist language detected");
  });

  it("detects triple exclamation marks as sensational", () => {
    const result = scoreHeuristic(makeArticle({ title: "Budget news!!!", source: "wsfa.com" }));
    expect(result.reason).toContain("Sensational or alarmist language detected");
  });

  it("detects 'conspiracy' keyword in the title", () => {
    const result = scoreHeuristic(
      makeArticle({ title: "Conspiracy uncovered in city hall", source: "wsfa.com" })
    );
    expect(result.reason).toContain("Sensational or alarmist language detected");
  });
});

describe("scoreHeuristic — all-caps headlines", () => {
  it("adds risk for more than 2 all-caps words in the title", () => {
    const result = scoreHeuristic(
      makeArticle({ title: "MASSIVE FRAUD EXPOSED in local government", source: "wsfa.com" })
    );
    expect(result.reason).toContain("Excessive all-caps language in headline");
  });

  it("does not penalise a title with exactly 2 all-caps words", () => {
    const result = scoreHeuristic(makeArticle({ title: "CITY HALL approves new budget plan today", source: "wsfa.com" }));
    expect(result.reason).not.toContain("Excessive all-caps language in headline");
  });

  it("ignores short all-caps words of 3 characters or fewer", () => {
    // "THE", "AND" etc. are ≤3 chars and should not trigger the caps penalty
    const result = scoreHeuristic(makeArticle({ title: "THE AND OR budget news", source: "wsfa.com" }));
    expect(result.reason).not.toContain("Excessive all-caps language in headline");
  });
});

describe("scoreHeuristic — excerpt length", () => {
  it("adds risk when the excerpt is shorter than 25 characters", () => {
    const result = scoreHeuristic(makeArticle({ excerpt: "Short.", source: "wsfa.com" }));
    expect(result.reason).toContain("No supporting context in excerpt");
  });

  it("adds risk when the excerpt is empty", () => {
    const result = scoreHeuristic(makeArticle({ excerpt: "", source: "wsfa.com" }));
    expect(result.reason).toContain("No supporting context in excerpt");
  });

  it("does not add risk when the excerpt is 25 or more characters", () => {
    const result = scoreHeuristic(
      makeArticle({ excerpt: "This is a normal-length excerpt.", source: "wsfa.com" })
    );
    expect(result.reason).not.toContain("No supporting context in excerpt");
  });
});

// ------------------------------------------------------------------
// scoreHeuristic — edge cases
// ------------------------------------------------------------------

describe("scoreHeuristic — edge cases and combined signals", () => {
  it("accumulates all four risk signals and reaches the maximum possible score", () => {
    // untrusted source (30) + caps>2 (20) + sensational language (20) + short excerpt (10) = 80
    const result = scoreHeuristic({
      title: "SHOCKING BOMBSHELL EXPOSED!!! cover-up conspiracy",
      excerpt: "No.",
      source: "randomfakenews.net",
    });
    expect(result.risk).toBe(80);
  });

  it("returns a HeuristicScore object with 'risk' and 'reason' fields", () => {
    const result = scoreHeuristic(makeArticle()) as HeuristicScore;
    expect(typeof result.risk).toBe("number");
    expect(typeof result.reason).toBe("string");
  });

  it("handles a source with mixed case containing a trusted fragment", () => {
    const result = scoreHeuristic(makeArticle({ source: "WSFA12.com" }));
    // wsfa12 is trusted regardless of case
    expect(result.reason).not.toContain("Unverified or unknown source");
  });

  it("joins multiple reasons with a period separator", () => {
    const result = scoreHeuristic({
      title: "normal title",
      excerpt: "Too short.",
      source: "unknownsource.net",
    });
    expect(result.reason).toContain(". ");
  });
});
