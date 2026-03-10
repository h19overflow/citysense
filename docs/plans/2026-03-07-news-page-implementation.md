# News Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/app/news` view to CommandCenter with two tabs: a dedicated news-only map and a newspaper-style editorial grid.

**Architecture:** New `NewsPage` component acts as tab container (Map / Newsletter). `NewsMapTab` renders a standalone Leaflet map with only `NewsMapOverlay` + sidebar. `NewsletterTab` renders a newspaper-style editorial layout with hero article and two-column grid. All data from existing `news_feed.json` via app context.

**Tech Stack:** React, TypeScript, react-leaflet, Tailwind CSS, lucide-react icons, existing app context/state management.

---

### Task 1: Add "news" to AppView type

**Files:**
- Modify: `frontend/src/lib/types.ts:3`

**Step 1: Update the AppView union type**

Change line 3 from:
```typescript
export type AppView = "cv" | "services" | "profile" | "admin";
```
to:
```typescript
export type AppView = "cv" | "services" | "profile" | "admin" | "news";
```

**Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to AppView

**Step 3: Commit**

```
feat(types): add "news" to AppView union
```

---

### Task 2: Create HeroArticle component

**Files:**
- Create: `frontend/src/components/app/news/HeroArticle.tsx`

**Step 1: Create the hero article component**

This is a large featured card: full-width image background with overlay gradient, title, excerpt, category badge, sentiment badge, source, and time. Clicking opens the source URL.

```tsx
import { ExternalLink, Clock, Globe } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";

interface HeroArticleProps {
  article: NewsArticle;
  onSelect: (article: NewsArticle) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-white/20 text-white border-white/30",
  development: "bg-blue-400/30 text-white border-blue-300/40",
  government: "bg-amber-400/30 text-white border-amber-300/40",
  community: "bg-emerald-400/30 text-white border-emerald-300/40",
  events: "bg-purple-400/30 text-white border-purple-300/40",
};

const SENTIMENT_DOTS: Record<string, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-gray-300",
  negative: "bg-rose-400",
};

function categoryStyle(category: string): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general;
}

export function HeroArticle({ article, onSelect }: HeroArticleProps) {
  const hasImage = !!article.imageUrl && !article.imageUrl.startsWith("data:");

  return (
    <div
      onClick={() => onSelect(article)}
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer group min-h-[280px] flex flex-col justify-end"
    >
      {/* Background */}
      {hasImage ? (
        <img
          src={article.imageUrl!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-6 space-y-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Featured
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${categoryStyle(article.category)}`}
          >
            {article.category}
          </span>
          {article.sentiment && (
            <span className="flex items-center gap-1 text-[10px] text-white/70">
              <span className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_DOTS[article.sentiment] ?? SENTIMENT_DOTS.neutral}`} />
              {article.sentiment}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white leading-tight line-clamp-3 group-hover:text-amber-100 transition-colors">
          {article.title}
        </h2>

        {/* Excerpt */}
        {(article.excerpt || article.summary) && (
          <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
            {article.excerpt || article.summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-white/60">
          {article.source && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {article.source}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(article.publishedAt)}
          </span>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-amber-300/80 hover:text-amber-200 transition-colors ml-auto"
          >
            Read full article
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```
feat(news): add HeroArticle component for newsletter featured article
```

---

### Task 3: Create NewsletterTab component

**Files:**
- Create: `frontend/src/components/app/news/NewsletterTab.tsx`

**Step 1: Create the newsletter tab**

Newspaper-style editorial layout. Hero article at top, two-column grid below. Reuses `NewsCategoryTabs`, `NewsFilterBar`, `HeroArticle`, and `NewsCard`.

```tsx
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles, filterArticlesByCategory, sortArticlesByDate } from "@/lib/newsService";
import { NewsCard } from "./NewsCard";
import { NewsDetail } from "./NewsDetail";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import { HeroArticle } from "./HeroArticle";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import { Newspaper, Search } from "lucide-react";

type SortMode = "newest" | "oldest" | "most_liked";

function isArticleLiked(likedIds: string[], articleId: string): boolean {
  if (!likedIds || !Array.isArray(likedIds)) return false;
  return likedIds.includes(articleId);
}

function buildArticleCountsPerCategory(articles: NewsArticle[]): Record<string, number> {
  const counts: Record<string, number> = { all: articles.length };
  for (const article of articles) {
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }
  return counts;
}

function sortArticles(articles: NewsArticle[], sortMode: SortMode): NewsArticle[] {
  if (sortMode === "most_liked") {
    return [...articles].sort((a, b) => b.upvotes - a.upvotes);
  }
  const sorted = sortArticlesByDate(articles);
  return sortMode === "oldest" ? sorted.reverse() : sorted;
}

function filterBySearch(articles: NewsArticle[], query: string): NewsArticle[] {
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.source.toLowerCase().includes(q),
  );
}

function selectHeroArticle(articles: NewsArticle[]): NewsArticle | null {
  if (articles.length === 0) return null;
  // Pick the article with image and highest engagement, fallback to first
  const withImage = articles.filter((a) => a.imageUrl && !a.imageUrl.startsWith("data:"));
  if (withImage.length > 0) {
    return withImage.sort((a, b) => (b.upvotes + b.commentCount) - (a.upvotes + a.commentCount))[0];
  }
  return articles[0];
}

function SkeletonHero() {
  return (
    <div className="animate-pulse rounded-2xl bg-muted h-[280px] w-full" />
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
    </div>
  );
}

export function NewsletterTab() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    if (state.newsArticles.length === 0 && !state.newsLoading) {
      dispatch({ type: "SET_NEWS_LOADING", loading: true });
      fetchNewsArticles()
        .then((articles) => dispatch({ type: "SET_NEWS_ARTICLES", articles }))
        .catch((err) => console.error("[NewsletterTab] Failed to load articles", err))
        .finally(() => dispatch({ type: "SET_NEWS_LOADING", loading: false }));
    }
  }, []);

  function handleCategoryChange(category: NewsCategory) {
    dispatch({ type: "SET_NEWS_CATEGORY", category });
  }

  function handleSelectArticle(article: NewsArticle) {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: article.id });
  }

  function handleBackToFeed() {
    dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
  }

  function handleToggleLike(articleId: string) {
    dispatch({ type: "TOGGLE_ARTICLE_LIKE", articleId });
  }

  const articleCounts = buildArticleCountsPerCategory(state.newsArticles);

  // Article detail view
  const selectedArticle = state.selectedArticleId
    ? state.newsArticles.find((a) => a.id === state.selectedArticleId)
    : null;

  if (selectedArticle) {
    return (
      <NewsDetail
        article={selectedArticle}
        isLiked={isArticleLiked(state.likedArticleIds, selectedArticle.id)}
        onBack={handleBackToFeed}
        onLike={handleToggleLike}
      />
    );
  }

  // Apply filters + sort
  const afterCategory = filterArticlesByCategory(state.newsArticles, state.newsCategory);
  const afterSearch = filterBySearch(afterCategory, searchQuery);
  const visibleArticles = sortArticles(afterSearch, sortMode);

  const hero = selectHeroArticle(visibleArticles);
  const gridArticles = hero ? visibleArticles.filter((a) => a.id !== hero.id) : visibleArticles;

  // Split into left column (larger cards) and right column (compact)
  const leftColumn = gridArticles.slice(0, Math.ceil(gridArticles.length / 2));
  const rightColumn = gridArticles.slice(Math.ceil(gridArticles.length / 2));

  const isLoading = state.newsLoading && state.newsArticles.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-white px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Montgomery Newsletter</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 w-48"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="text-xs border border-border/50 rounded-lg px-2 py-1.5 bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>
        </div>

        <NewsCategoryTabs
          activeCategory={state.newsCategory}
          onCategoryChange={handleCategoryChange}
          articleCounts={articleCounts}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-4">
            <SkeletonHero />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Newspaper className="w-8 h-8 opacity-30" />
            <p className="text-sm">No articles match your filters</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Hero */}
            {hero && <HeroArticle article={hero} onSelect={handleSelectArticle} />}

            {/* Two-column editorial grid */}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="flex flex-col gap-4">
                  {leftColumn.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      isLiked={isArticleLiked(state.likedArticleIds, article.id)}
                      onSelect={handleSelectArticle}
                      onLike={handleToggleLike}
                    />
                  ))}
                </div>
                {/* Right column */}
                <div className="flex flex-col gap-4">
                  {rightColumn.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      isLiked={isArticleLiked(state.likedArticleIds, article.id)}
                      onSelect={handleSelectArticle}
                      onLike={handleToggleLike}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```
feat(news): add NewsletterTab with hero article and editorial grid layout
```

---

### Task 4: Create NewsMapTab component

**Files:**
- Create: `frontend/src/components/app/news/NewsMapTab.tsx`

**Step 1: Create the dedicated news map tab**

Standalone Leaflet map showing only news markers. Reuses `NewsMapOverlay`, `NewsSidebarPanel`, `NewsSentimentLegend`, and fly-to logic from `ServiceMapView` but without service points.

```tsx
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useApp } from "@/lib/appContext";
import { fetchNewsArticles } from "@/lib/newsService";
import { filterGeolocatedArticles } from "@/lib/newsMapMarkers";
import { NewsMapOverlay } from "./NewsMapOverlay";
import { NewsSidebarPanel } from "./NewsSidebarPanel";
import { NewsSentimentLegend } from "./NewsSentimentLegend";
import "@/lib/leafletSetup";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

function FlyToArticle({ target }: { target: { lat: number; lng: number; ts: number } | null }) {
  const map = useMap();
  const prevTs = { current: 0 };
  useEffect(() => {
    if (target && target.ts !== prevTs.current) {
      map.flyTo([target.lat, target.lng], 15, { duration: 0.6 });
      prevTs.current = target.ts;
    }
  }, [target, map]);
  return null;
}

export function NewsMapTab() {
  const { state, dispatch } = useApp();
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [focusedArticle, setFocusedArticle] = useState<{ id: string; ts: number } | null>(null);

  useEffect(() => {
    if (state.newsArticles.length === 0) {
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) {
          dispatch({ type: "SET_NEWS_ARTICLES", articles });
        }
      });
    }
  }, []);

  // Ensure news map mode is visible
  useEffect(() => {
    if (!state.newsMapVisible) {
      dispatch({ type: "TOGGLE_NEWS_MAP" });
    }
  }, []);

  function handleSelectArticle(articleId: string) {
    const article = state.newsArticles.find((a) => a.id === articleId);
    if (article?.location) {
      const ts = Date.now();
      setFlyTarget({ lat: article.location.lat, lng: article.location.lng, ts });
      setFocusedArticle({ id: articleId, ts });
    }
  }

  function handleZoomToNeighborhood(lat: number, lng: number) {
    setFlyTarget({ lat, lng, ts: Date.now() });
  }

  const geoArticles = filterGeolocatedArticles(state.newsArticles);

  return (
    <div className="flex-1 flex min-h-0 relative">
      <div className="flex-1 relative">
        <MapContainer center={MONTGOMERY_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <NewsMapOverlay
            selectedArticleId={focusedArticle?.id ?? null}
            selectionTs={focusedArticle?.ts ?? 0}
          />
          <FlyToArticle target={flyTarget} />
        </MapContainer>

        <NewsSentimentLegend
          articles={geoArticles}
          reactionCounts={state.newsReactions}
          mode={state.newsMapMode}
          onModeChange={(mode) => dispatch({ type: "SET_NEWS_MAP_MODE", mode })}
        />

        <NewsSidebarPanel
          articles={geoArticles}
          reactionCounts={state.newsReactions}
          comments={state.newsComments}
          mode={state.newsMapMode}
          onModeChange={(mode) => dispatch({ type: "SET_NEWS_MAP_MODE", mode })}
          onZoomToNeighborhood={handleZoomToNeighborhood}
          onSelectArticle={handleSelectArticle}
          focusedArticleId={focusedArticle?.id ?? null}
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```
feat(news): add NewsMapTab with dedicated news-only Leaflet map
```

---

### Task 5: Create NewsPage tab container

**Files:**
- Create: `frontend/src/components/app/news/NewsPage.tsx`

**Step 1: Create the tab container**

Two-tab layout: Map and Newsletter. Uses a simple toggle at the top.

```tsx
import { useState } from "react";
import { Map, Newspaper } from "lucide-react";
import { NewsMapTab } from "./NewsMapTab";
import { NewsletterTab } from "./NewsletterTab";

type NewsTab = "map" | "newsletter";

const TABS: { id: NewsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "News Map", icon: Map },
  { id: "newsletter", label: "Newsletter", icon: Newspaper },
];

export function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsTab>("newsletter");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-1 px-5 py-2.5 border-b border-border/30 bg-white">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === "map" && <NewsMapTab />}
        {activeTab === "newsletter" && <NewsletterTab />}
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```
feat(news): add NewsPage tab container with map and newsletter tabs
```

---

### Task 6: Wire NewsPage into CommandCenter and navigation

**Files:**
- Modify: `frontend/src/pages/CommandCenter.tsx`
- Modify: `frontend/src/components/app/FlowSidebar.tsx`
- Modify: `frontend/src/components/app/MobileNav.tsx`

**Step 1: Update CommandCenter to handle the "news" view**

In `CommandCenter.tsx`:

a) Add `"news"` to the valid views set (line 23):
```typescript
const VALID_VIEWS = new Set<string>(["services", "cv", "profile", "news"]);
```

b) Add the import at the top (after the other component imports, around line 8):
```typescript
import { NewsPage } from "@/components/app/news/NewsPage";
```

c) Add the news view rendering inside the main content area (after the profile view, around line 141):
```tsx
{currentView === "news" && <NewsPage />}
```

**Step 2: Update FlowSidebar to add news nav item**

In `FlowSidebar.tsx`:

a) Add `Newspaper` to the lucide-react import (line 3):
```typescript
import {
  TrendingUp,
  Layers,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from "lucide-react";
```

b) Add the news item to `NAV_ITEMS` array (after "Career Growth", line 22):
```typescript
const NAV_ITEMS: {
  label: string;
  view: AppView;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "Services", view: "services", icon: Layers },
  { label: "Career Growth", view: "cv", icon: TrendingUp },
  { label: "News", view: "news", icon: Newspaper },
];
```

**Step 3: Update MobileNav to add news tab**

In `MobileNav.tsx`:

a) Add `Newspaper` to the lucide-react import (line 1):
```typescript
import { Layers, TrendingUp, Newspaper } from "lucide-react";
```

b) Update the `MobileTab` type (line 3):
```typescript
export type MobileTab = "services" | "cv" | "news";
```

c) Add the news tab to the tabs array (line 28):
```typescript
const tabs: TabConfig[] = [
  { id: "services", label: "Services", icon: Layers, badgeCount: actionItemCount },
  { id: "cv", label: "Career", icon: TrendingUp },
  { id: "news", label: "News", icon: Newspaper },
];
```

**Step 4: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 5: Verify the app builds successfully**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: Build succeeds with no errors

**Step 6: Commit**

```
feat(news): wire NewsPage into CommandCenter, sidebar, and mobile nav
```

---

### Task 7: Smoke test the full feature

**Step 1: Start the dev server and verify**

Run: `cd frontend && npx vite --host 2>&1 &`

Manual checks:
1. Navigate to `http://localhost:5173/app/news` — should show NewsPage with Newsletter tab active
2. Click "News Map" tab — should render Leaflet map with news pins
3. Click "Newsletter" tab — should show hero article + two-column grid
4. Click a category tab — filters both tabs
5. Search bar filters articles
6. Sidebar nav shows "News" icon in both collapsed and expanded states
7. Mobile nav at bottom shows "News" tab
8. Article detail opens when clicking a card and back button returns to grid

**Step 2: Final commit if any fixes needed**

```
fix(news): address smoke test issues
```
