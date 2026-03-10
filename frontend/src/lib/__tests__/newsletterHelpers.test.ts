import { describe, it, expect } from "vitest";
import {
  sortArticles,
  filterBySearch,
  buildArticleCountsPerCategory,
  isArticleLiked,
  selectHeroArticle,
} from "../../components/app/news/newsletterHelpers";
import type { NewsArticle, NewsComment } from "../types";

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: "article-1",
    title: "Local News Story",
    excerpt: "A story about Montgomery",
    body: "",
    source: "wsfa",
    sourceUrl: "https://wsfa.com/story",
    category: "general",
    publishedAt: "2 hours ago",
    scrapedAt: "2026-03-08T10:00:00Z",
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    ...overrides,
  };
}

function makeComment(articleId: string): NewsComment {
  return {
    id: `comment-${Math.random()}`,
    articleId,
    citizenId: "user-1",
    citizenName: "Jane Doe",
    avatarInitials: "JD",
    avatarColor: "#aaa",
    content: "Great story!",
    createdAt: "2026-03-08T10:00:00Z",
  };
}

// ------------------------------------------------------------------
// buildArticleCountsPerCategory
// ------------------------------------------------------------------

describe("buildArticleCountsPerCategory", () => {
  it("returns 'all' count equal to total number of articles", () => {
    const articles = [makeArticle({ category: "general" }), makeArticle({ category: "government" })];
    const counts = buildArticleCountsPerCategory(articles);
    expect(counts["all"]).toBe(2);
  });

  it("counts articles per category correctly", () => {
    const articles = [
      makeArticle({ category: "general" }),
      makeArticle({ category: "general" }),
      makeArticle({ category: "government" }),
    ];
    const counts = buildArticleCountsPerCategory(articles);
    expect(counts["general"]).toBe(2);
    expect(counts["government"]).toBe(1);
  });

  it("returns { all: 0 } for an empty article list", () => {
    const counts = buildArticleCountsPerCategory([]);
    expect(counts).toEqual({ all: 0 });
  });

  it("handles a single article with a unique category", () => {
    const counts = buildArticleCountsPerCategory([makeArticle({ category: "events" })]);
    expect(counts["events"]).toBe(1);
    expect(counts["all"]).toBe(1);
  });

  it("does not include categories not present in the articles", () => {
    const counts = buildArticleCountsPerCategory([makeArticle({ category: "general" })]);
    expect(counts["government"]).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// filterBySearch
// ------------------------------------------------------------------

describe("filterBySearch", () => {
  const articles = [
    makeArticle({ id: "a1", title: "City Council Meeting", excerpt: "Budget approved", source: "wsfa" }),
    makeArticle({ id: "a2", title: "Road Repairs Begin", excerpt: "Paving starts downtown", source: "al.com" }),
    makeArticle({ id: "a3", title: "Festival This Weekend", excerpt: "Music and food", source: "wsfa" }),
  ];

  it("returns all articles when query is an empty string", () => {
    const result = filterBySearch(articles, "");
    expect(result).toHaveLength(3);
  });

  it("returns all articles when query is only whitespace", () => {
    const result = filterBySearch(articles, "   ");
    expect(result).toHaveLength(3);
  });

  it("filters articles matching the title", () => {
    const result = filterBySearch(articles, "road");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("filters articles matching the excerpt", () => {
    const result = filterBySearch(articles, "paving");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("filters articles matching the source", () => {
    const result = filterBySearch(articles, "al.com");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("is case-insensitive", () => {
    const result = filterBySearch(articles, "COUNCIL");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
  });

  it("returns empty array when no articles match the query", () => {
    const result = filterBySearch(articles, "zzznomatch");
    expect(result).toHaveLength(0);
  });

  it("returns multiple articles when multiple match", () => {
    const result = filterBySearch(articles, "wsfa");
    expect(result).toHaveLength(2);
  });
});

// ------------------------------------------------------------------
// sortArticles
// ------------------------------------------------------------------

describe("sortArticles", () => {
  const low = makeArticle({ id: "low", upvotes: 5, commentCount: 1, publishedAt: "3 days ago" });
  const high = makeArticle({ id: "high", upvotes: 50, commentCount: 10, publishedAt: "1 hour ago" });
  const mid = makeArticle({ id: "mid", upvotes: 20, commentCount: 5, publishedAt: "2 hours ago" });

  it("sorts by upvotes descending when sortMode is most_liked", () => {
    const result = sortArticles([low, mid, high], "most_liked");
    expect(result.map((a) => a.id)).toEqual(["high", "mid", "low"]);
  });

  it("does not mutate the original array when sorting by most_liked", () => {
    const original = [low, high, mid];
    sortArticles(original, "most_liked");
    expect(original.map((a) => a.id)).toEqual(["low", "high", "mid"]);
  });

  it("sorts by comment count descending when sortMode is most_comments", () => {
    const result = sortArticles([low, mid, high], "most_comments");
    expect(result[0].id).toBe("high");
    expect(result[2].id).toBe("low");
  });

  it("includes live comment counts when sorting by most_comments", () => {
    const comments = [makeComment("low"), makeComment("low"), makeComment("low")];
    const result = sortArticles([low, mid, high], "most_comments", comments);
    // low: commentCount=1 + 3 live = 4; mid: 5; high: 10
    expect(result[0].id).toBe("high");
    expect(result[1].id).toBe("mid");
    expect(result[2].id).toBe("low");
  });

  it("sorts by date newest first when sortMode is newest", () => {
    const result = sortArticles([low, mid, high], "newest");
    // high is 1 hour ago, mid is 2 hours ago, low is 3 days ago
    expect(result[0].id).toBe("high");
    expect(result[2].id).toBe("low");
  });

  it("sorts by date oldest first when sortMode is oldest", () => {
    const result = sortArticles([low, mid, high], "oldest");
    expect(result[0].id).toBe("low");
    expect(result[2].id).toBe("high");
  });

  it("returns empty array when input is empty", () => {
    const result = sortArticles([], "most_liked");
    expect(result).toHaveLength(0);
  });

  it("returns single-element array unchanged", () => {
    const result = sortArticles([high], "most_liked");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("high");
  });
});

// ------------------------------------------------------------------
// isArticleLiked
// ------------------------------------------------------------------

describe("isArticleLiked", () => {
  it("returns true when the article id is in the liked list", () => {
    expect(isArticleLiked(["a1", "a2"], "a1")).toBe(true);
  });

  it("returns false when the article id is not in the liked list", () => {
    expect(isArticleLiked(["a1", "a2"], "a3")).toBe(false);
  });

  it("returns false for an empty liked list", () => {
    expect(isArticleLiked([], "a1")).toBe(false);
  });

  it("returns false when likedIds is null-ish", () => {
    expect(isArticleLiked(null as unknown as string[], "a1")).toBe(false);
  });
});

// ------------------------------------------------------------------
// selectHeroArticle
// ------------------------------------------------------------------

describe("selectHeroArticle", () => {
  it("returns null for an empty article list", () => {
    expect(selectHeroArticle([])).toBeNull();
  });

  it("prefers articles with a real image url", () => {
    const withImage = makeArticle({ id: "img", imageUrl: "https://example.com/photo.jpg", upvotes: 1 });
    const noImage = makeArticle({ id: "noimg", imageUrl: null, upvotes: 100 });
    const result = selectHeroArticle([noImage, withImage]);
    expect(result!.id).toBe("img");
  });

  it("excludes data: urls when selecting hero by image", () => {
    const dataUrl = makeArticle({ id: "data", imageUrl: "data:image/png;base64,abc", upvotes: 100 });
    const real = makeArticle({ id: "real", imageUrl: "https://cdn.example.com/img.png", upvotes: 1 });
    const result = selectHeroArticle([dataUrl, real]);
    expect(result!.id).toBe("real");
  });

  it("selects highest engagement article when multiple have images", () => {
    const lowEngagement = makeArticle({ id: "low", imageUrl: "https://a.com/1.jpg", upvotes: 2, commentCount: 1 });
    const highEngagement = makeArticle({ id: "high", imageUrl: "https://a.com/2.jpg", upvotes: 50, commentCount: 20 });
    const result = selectHeroArticle([lowEngagement, highEngagement]);
    expect(result!.id).toBe("high");
  });

  it("falls back to first article when none have a valid image url", () => {
    const first = makeArticle({ id: "first", imageUrl: null });
    const second = makeArticle({ id: "second", imageUrl: null });
    const result = selectHeroArticle([first, second]);
    expect(result!.id).toBe("first");
  });
});
