import { describe, it, expect } from "vitest";
import {
  getScoreByZip,
  getAllScores,
  getScoreColor,
  getScoreLevel,
} from "../neighborhoodScorer";
import type { NeighborhoodScore } from "../neighborhoodScorer";

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeScore(overrides: Partial<NeighborhoodScore> = {}): NeighborhoodScore {
  return {
    zip: "36104",
    score: 75,
    label: "Good",
    counts: { "311": 5, violations: 2, permits: 10, flood: 0, paving: 1 },
    ...overrides,
  };
}

function makeCollection(scores: NeighborhoodScore[]) {
  return {
    type: "FeatureCollection" as const,
    features: scores.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [-86.3, 32.37] as [number, number] },
      properties: s,
    })),
    metadata: { generated_at: "2026-03-08T00:00:00Z", weights: {} },
  };
}

// ------------------------------------------------------------------
// getScoreByZip
// ------------------------------------------------------------------

describe("getScoreByZip", () => {
  it("returns the matching score for a zip that exists", () => {
    const data = makeCollection([makeScore({ zip: "36104" }), makeScore({ zip: "36109" })]);
    const result = getScoreByZip("36104", data);
    expect(result).not.toBeNull();
    expect(result!.zip).toBe("36104");
  });

  it("returns null when the zip is not in the collection", () => {
    const data = makeCollection([makeScore({ zip: "36104" })]);
    const result = getScoreByZip("99999", data);
    expect(result).toBeNull();
  });

  it("returns null for an empty collection", () => {
    const data = makeCollection([]);
    const result = getScoreByZip("36104", data);
    expect(result).toBeNull();
  });

  it("returns the complete score object including counts", () => {
    const score = makeScore({ zip: "36104", score: 55, counts: { "311": 3, violations: 1, permits: 4, flood: 2, paving: 0 } });
    const data = makeCollection([score]);
    const result = getScoreByZip("36104", data);
    expect(result!.counts["311"]).toBe(3);
    expect(result!.counts.violations).toBe(1);
  });

  it("returns the first matching feature when duplicates exist", () => {
    const first = makeScore({ zip: "36104", score: 80 });
    const second = makeScore({ zip: "36104", score: 40 });
    const data = makeCollection([first, second]);
    const result = getScoreByZip("36104", data);
    expect(result!.score).toBe(80);
  });
});

// ------------------------------------------------------------------
// getAllScores
// ------------------------------------------------------------------

describe("getAllScores", () => {
  it("returns all scores in the collection", () => {
    const scores = [makeScore({ zip: "36104" }), makeScore({ zip: "36109" }), makeScore({ zip: "36116" })];
    const data = makeCollection(scores);
    const result = getAllScores(data);
    expect(result).toHaveLength(3);
  });

  it("returns an empty array for an empty collection", () => {
    const data = makeCollection([]);
    const result = getAllScores(data);
    expect(result).toEqual([]);
  });

  it("maps features to their properties exactly", () => {
    const score = makeScore({ zip: "36104", score: 65, label: "Fair" });
    const data = makeCollection([score]);
    const result = getAllScores(data);
    expect(result[0].zip).toBe("36104");
    expect(result[0].score).toBe(65);
    expect(result[0].label).toBe("Fair");
  });
});

// ------------------------------------------------------------------
// getScoreColor
// ------------------------------------------------------------------

describe("getScoreColor", () => {
  it("returns green hex for score 70 (boundary)", () => {
    expect(getScoreColor(70)).toBe("#2D6A4F");
  });

  it("returns green hex for score above 70", () => {
    expect(getScoreColor(100)).toBe("#2D6A4F");
    expect(getScoreColor(85)).toBe("#2D6A4F");
  });

  it("returns yellow/amber hex for score 40 (boundary)", () => {
    expect(getScoreColor(40)).toBe("#C8882A");
  });

  it("returns yellow/amber hex for score between 40 and 69", () => {
    expect(getScoreColor(55)).toBe("#C8882A");
    expect(getScoreColor(69)).toBe("#C8882A");
  });

  it("returns red hex for score below 40", () => {
    expect(getScoreColor(39)).toBe("#d83933");
    expect(getScoreColor(0)).toBe("#d83933");
  });
});

// ------------------------------------------------------------------
// getScoreLevel
// ------------------------------------------------------------------

describe("getScoreLevel", () => {
  it("returns 'green' for score 70 (boundary)", () => {
    expect(getScoreLevel(70)).toBe("green");
  });

  it("returns 'green' for score above 70", () => {
    expect(getScoreLevel(100)).toBe("green");
    expect(getScoreLevel(71)).toBe("green");
  });

  it("returns 'yellow' for score 40 (boundary)", () => {
    expect(getScoreLevel(40)).toBe("yellow");
  });

  it("returns 'yellow' for scores in the 40–69 range", () => {
    expect(getScoreLevel(55)).toBe("yellow");
    expect(getScoreLevel(69)).toBe("yellow");
  });

  it("returns 'red' for score 39 (just below yellow boundary)", () => {
    expect(getScoreLevel(39)).toBe("red");
  });

  it("returns 'red' for score 0", () => {
    expect(getScoreLevel(0)).toBe("red");
  });
});
