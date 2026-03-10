# News Sentiment Map Overlay — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move news from a standalone sidebar tab into an interactive map overlay on the Services map with geolocated markers, community sentiment reactions, and a sentiment legend.

**Architecture:** Backend enriches news articles with lat/lng via Bright Data Google Maps SERP. Frontend renders a self-contained `NewsMapOverlay` as a Leaflet child component inside the existing `ServiceMapView`, toggled by a "What's Happening in Montgomery" switch. Reactions are stored client-side with localStorage persistence.

**Tech Stack:** Python (Bright Data SDK, SERP API), React + TypeScript, Leaflet + react-leaflet, Tailwind CSS, shadcn/ui

---

## Task 1: Create branch and update TypeScript types

**Files:**
- Modify: `montgomery-navigator/src/lib/types.ts:292-312`

**Step 1: Create the feature branch**

```bash
git checkout -b news/sentiment
```

**Step 2: Add location and reaction types to types.ts**

Add after the `NewsCategory` type (line 292) and update the `NewsArticle` interface:

```typescript
// Add after line 292 (after NewsCategory type)
export type ReactionType = "thumbs_up" | "thumbs_down" | "heart" | "sad" | "angry";

export interface NewsLocation {
  lat: number;
  lng: number;
  neighborhood: string;
  address: string;
}
```

Update `NewsArticle` to add location field (inside the existing interface, after `misinfoRisk`):

```typescript
  location?: NewsLocation | null;
```

Update `AppState` to add news map state fields (inside the existing interface, after `selectedArticleId`):

```typescript
  newsMapVisible: boolean;
  newsMapMode: "pins" | "heat";
  newsReactions: Record<string, Record<ReactionType, number>>;
  userReactions: Record<string, ReactionType>;
```

**Step 3: Verify the file compiles**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

Expected: no errors

**Step 4: Commit**

```bash
git add montgomery-navigator/src/lib/types.ts
git commit -m "feat(types): add NewsLocation, ReactionType, and news map state fields"
```

---

## Task 2: Update appContext with news map state + actions

**Files:**
- Modify: `montgomery-navigator/src/lib/appContext.tsx:28-68` (AppAction union)
- Modify: `montgomery-navigator/src/lib/appContext.tsx:70-105` (initialState)
- Modify: `montgomery-navigator/src/lib/appContext.tsx:124-258` (reducer)

**Step 1: Add new imports to appContext.tsx**

Add `ReactionType` to the import from `./types` (line 1-26):

```typescript
import type {
  // ... existing imports ...
  ReactionType,
} from "./types";
```

**Step 2: Add new actions to AppAction union (after line 68)**

```typescript
  | { type: "TOGGLE_NEWS_MAP" }
  | { type: "SET_NEWS_MAP_MODE"; mode: "pins" | "heat" }
  | { type: "SET_ARTICLE_REACTION"; articleId: string; reaction: ReactionType };
```

**Step 3: Add initial state values (inside initialState, after `selectedArticleId: null`)**

```typescript
  newsMapVisible: false,
  newsMapMode: "pins" as const,
  newsReactions: {},
  userReactions: {},
```

**Step 4: Add reducer cases (before the `default:` case)**

```typescript
    case "TOGGLE_NEWS_MAP":
      return { ...state, newsMapVisible: !state.newsMapVisible };
    case "SET_NEWS_MAP_MODE":
      return { ...state, newsMapMode: action.mode };
    case "SET_ARTICLE_REACTION": {
      const prev = state.newsReactions[action.articleId] ?? {};
      const oldReaction = state.userReactions[action.articleId];
      const updated = { ...prev };
      if (oldReaction) {
        updated[oldReaction] = Math.max((updated[oldReaction] ?? 0) - 1, 0);
      }
      updated[action.reaction] = (updated[action.reaction] ?? 0) + 1;
      return {
        ...state,
        newsReactions: { ...state.newsReactions, [action.articleId]: updated },
        userReactions: { ...state.userReactions, [action.articleId]: action.reaction },
      };
    }
```

**Step 5: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add montgomery-navigator/src/lib/appContext.tsx
git commit -m "feat(state): add news map toggle, mode, and reaction actions"
```

---

## Task 3: Remove News tab from sidebar and mobile nav

**Files:**
- Modify: `montgomery-navigator/src/components/app/FlowSidebar.tsx:15-23`
- Modify: `montgomery-navigator/src/components/app/MobileNav.tsx:1-29`
- Modify: `montgomery-navigator/src/pages/CommandCenter.tsx:10,23,125`

**Step 1: Remove News from FlowSidebar NAV_ITEMS**

In `FlowSidebar.tsx`, change the NAV_ITEMS array (lines 15-23) to remove the News entry and the Newspaper import:

```typescript
import {
  TrendingUp,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
```

```typescript
const NAV_ITEMS: {
  label: string;
  view: AppView;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "Services", view: "services", icon: Layers },
  { label: "Career Growth", view: "cv", icon: TrendingUp },
];
```

**Step 2: Remove News from MobileNav**

In `MobileNav.tsx`, remove `"news"` from the `MobileTab` type and the `tabs` array:

```typescript
export type MobileTab = "services" | "cv";
```

Remove the News tab from the tabs array (line 29):
```typescript
  const tabs: TabConfig[] = [
    { id: "services", label: "Services", icon: Layers, badgeCount: actionItemCount },
    { id: "cv", label: "Career", icon: TrendingUp },
  ];
```

Remove the `Newspaper` import (line 1).

**Step 3: Remove News view rendering from CommandCenter**

In `CommandCenter.tsx`:
- Remove the `NewsView` import (line 10)
- Remove `"news"` from `VALID_VIEWS` set (line 23): `new Set<string>(["services", "cv", "profile"])`
- Remove the news conditional render (line 125): delete `{currentView === "news" && <NewsView />}`

**Step 4: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add montgomery-navigator/src/components/app/FlowSidebar.tsx montgomery-navigator/src/components/app/MobileNav.tsx montgomery-navigator/src/pages/CommandCenter.tsx
git commit -m "refactor(nav): remove News tab from sidebar and mobile nav"
```

---

## Task 4: Create news map marker utilities

**Files:**
- Create: `montgomery-navigator/src/lib/newsMapMarkers.ts`

**Step 1: Create the marker utility module**

```typescript
import L from "leaflet";
import type { NewsArticle } from "./types";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#eab308",
  negative: "#ef4444",
};

const newsIconCache = new Map<string, L.DivIcon>();

function buildNewsMarkerHtml(sentiment: string, size: number): string {
  const color = SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2.5px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.45)}px;line-height:1;
  ">📰</div>`;
}

export function createNewsMarker(sentiment: string = "neutral"): L.DivIcon {
  const size = 30;
  const cacheKey = `news-${sentiment}-${size}`;
  const cached = newsIconCache.get(cacheKey);
  if (cached) return cached;

  const icon = L.divIcon({
    className: "news-marker",
    html: buildNewsMarkerHtml(sentiment, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  newsIconCache.set(cacheKey, icon);
  return icon;
}

export function buildClusterMarkerHtml(count: number, avgSentiment: string): string {
  const color = SENTIMENT_COLORS[avgSentiment] ?? SENTIMENT_COLORS.neutral;
  return `<div style="
    width:36px;height:36px;border-radius:50%;
    background:${color};border:2.5px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
    font-size:13px;font-weight:700;color:white;line-height:1;
  ">${count}</div>`;
}

export function getSentimentColor(sentiment: string): string {
  return SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
}

export function filterGeolocatedArticles(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter(
    (a) => a.location && !isNaN(a.location.lat) && !isNaN(a.location.lng),
  );
}

export function computeAverageSentiment(articles: NewsArticle[]): string {
  if (articles.length === 0) return "neutral";
  const scores = articles.map((a) => {
    if (a.sentiment === "positive") return 1;
    if (a.sentiment === "negative") return -1;
    return 0;
  });
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  if (avg > 0.3) return "positive";
  if (avg < -0.3) return "negative";
  return "neutral";
}
```

**Step 2: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add montgomery-navigator/src/lib/newsMapMarkers.ts
git commit -m "feat(map): add news marker utilities with sentiment colors"
```

---

## Task 5: Create NewsPopupCard component

**Files:**
- Create: `montgomery-navigator/src/components/app/news/NewsPopupCard.tsx`

**Step 1: Create the floating popup card**

This component renders inside a Leaflet `Popup` when a news marker is clicked. It shows the article headline, image, sentiment, and emoji reaction buttons.

```typescript
import { ExternalLink } from "lucide-react";
import type { NewsArticle, ReactionType } from "@/lib/types";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import { formatRelativeTime } from "@/lib/newsService";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "thumbs_up", emoji: "👍", label: "Like" },
  { type: "thumbs_down", emoji: "👎", label: "Dislike" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

interface NewsPopupCardProps {
  article: NewsArticle;
  reactionCounts: Record<ReactionType, number>;
  userReaction: ReactionType | undefined;
  onReact: (articleId: string, reaction: ReactionType) => void;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const color = getSentimentColor(sentiment);
  const label = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  return (
    <span
      style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}
    >
      {label}
    </span>
  );
}

export function NewsPopupCard({ article, reactionCounts, userReaction, onReact }: NewsPopupCardProps) {
  const totalReactions = Object.values(reactionCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div style={{ minWidth: 260, maxWidth: 300, fontFamily: "system-ui, sans-serif" }}>
      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt=""
          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "6px 6px 0 0", marginBottom: 8 }}
        />
      )}

      <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <SentimentBadge sentiment={article.sentiment ?? "neutral"} />
        <span style={{ fontSize: 10, color: "#888" }}>{article.category}</span>
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, marginBottom: 4, color: "#1a1a1a" }}>
        {article.title}
      </h3>

      {article.excerpt && (
        <p style={{ fontSize: 11, color: "#666", lineHeight: 1.4, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.excerpt}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "#999" }}>
          {article.source} · {formatRelativeTime(article.publishedAt || article.scrapedAt)}
        </span>
        {article.location?.neighborhood && (
          <span style={{ fontSize: 10, color: "#666", fontWeight: 500 }}>
            📍 {article.location.neighborhood}
          </span>
        )}
      </div>

      {/* Reaction bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 6, paddingTop: 6, borderTop: "1px solid #e5e7eb" }}>
        {REACTIONS.map(({ type, emoji, label }) => {
          const isActive = userReaction === type;
          const count = reactionCounts[type] ?? 0;
          return (
            <button
              key={type}
              onClick={() => onReact(article.id, type)}
              title={label}
              style={{
                display: "flex", alignItems: "center", gap: 2,
                padding: "3px 6px", borderRadius: 12, border: "1px solid",
                borderColor: isActive ? "#3b82f6" : "#e5e7eb",
                background: isActive ? "#eff6ff" : "transparent",
                fontSize: 12, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ fontSize: 10, color: "#666" }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {totalReactions > 0 && (
        <div style={{ fontSize: 10, color: "#999", marginBottom: 6 }}>
          {totalReactions} reaction{totalReactions !== 1 ? "s" : ""} from residents
        </div>
      )}

      <a
        href={article.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, color: "#3b82f6", fontWeight: 500, textDecoration: "none",
        }}
      >
        Read full article <ExternalLink size={10} />
      </a>
    </div>
  );
}
```

**Step 2: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/news/NewsPopupCard.tsx
git commit -m "feat(news): add NewsPopupCard with reactions and sentiment badge"
```

---

## Task 6: Create NewsSentimentLegend component

**Files:**
- Create: `montgomery-navigator/src/components/app/news/NewsSentimentLegend.tsx`

**Step 1: Create the legend component**

This floats in the bottom-left of the map (like the existing category legend) showing sentiment scale and aggregate reaction summary.

```typescript
import type { NewsArticle, ReactionType } from "@/lib/types";
import { getSentimentColor } from "@/lib/newsMapMarkers";

interface NewsSentimentLegendProps {
  articles: NewsArticle[];
  reactionCounts: Record<string, Record<ReactionType, number>>;
  mode: "pins" | "heat";
  onModeChange: (mode: "pins" | "heat") => void;
}

function countBySentiment(articles: NewsArticle[]): Record<string, number> {
  const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const a of articles) {
    const key = a.sentiment ?? "neutral";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function aggregateReactions(
  reactionCounts: Record<string, Record<ReactionType, number>>,
): Record<ReactionType, number> {
  const totals: Record<string, number> = {};
  for (const articleReactions of Object.values(reactionCounts)) {
    for (const [type, count] of Object.entries(articleReactions)) {
      totals[type] = (totals[type] ?? 0) + count;
    }
  }
  return totals as Record<ReactionType, number>;
}

export function NewsSentimentLegend({ articles, reactionCounts, mode, onModeChange }: NewsSentimentLegendProps) {
  const sentimentCounts = countBySentiment(articles);
  const totalReactions = aggregateReactions(reactionCounts);
  const topReaction = Object.entries(totalReactions).sort(([, a], [, b]) => b - a)[0];

  const REACTION_EMOJIS: Record<string, string> = {
    thumbs_up: "👍", thumbs_down: "👎", heart: "❤️", sad: "😢", angry: "😡",
  };

  return (
    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg z-[1000] max-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">News Pulse</span>
        <div className="flex gap-1">
          <button
            onClick={() => onModeChange("pins")}
            className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
              mode === "pins" ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Pins
          </button>
          <button
            onClick={() => onModeChange("heat")}
            className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
              mode === "heat" ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Heat
          </button>
        </div>
      </div>

      {/* Sentiment scale */}
      <div className="space-y-1 mb-3">
        {(["positive", "neutral", "negative"] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getSentimentColor(s) }}
            />
            <span className="text-[10px] text-muted-foreground capitalize flex-1">{s}</span>
            <span className="text-[10px] font-semibold text-foreground">{sentimentCounts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Community pulse */}
      {topReaction && topReaction[1] > 0 && (
        <div className="pt-2 border-t border-border/30">
          <div className="text-[10px] text-muted-foreground mb-1">Community pulse</div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{REACTION_EMOJIS[topReaction[0]] ?? "👍"}</span>
            <span className="text-[10px] font-medium text-foreground">
              Most common reaction ({topReaction[1]})
            </span>
          </div>
        </div>
      )}

      <div className="text-[9px] text-muted-foreground/60 mt-2">
        {articles.length} stories on map
      </div>
    </div>
  );
}
```

**Step 2: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/news/NewsSentimentLegend.tsx
git commit -m "feat(news): add NewsSentimentLegend with sentiment scale and mode toggle"
```

---

## Task 7: Create NewsMapOverlay component

**Files:**
- Create: `montgomery-navigator/src/components/app/news/NewsMapOverlay.tsx`

**Step 1: Create the main overlay component**

This is the core component rendered inside `<MapContainer>`. It reads geolocated articles from state and renders markers with popups.

```typescript
import { Marker, Popup, CircleMarker } from "react-leaflet";
import { useApp } from "@/lib/appContext";
import { createNewsMarker, filterGeolocatedArticles, getSentimentColor, computeAverageSentiment } from "@/lib/newsMapMarkers";
import { NewsPopupCard } from "./NewsPopupCard";
import { NewsSentimentLegend } from "./NewsSentimentLegend";
import type { ReactionType } from "@/lib/types";

export function NewsMapOverlay() {
  const { state, dispatch } = useApp();
  const geoArticles = filterGeolocatedArticles(state.newsArticles);

  function handleReaction(articleId: string, reaction: ReactionType) {
    dispatch({ type: "SET_ARTICLE_REACTION", articleId, reaction });
  }

  function handleModeChange(mode: "pins" | "heat") {
    dispatch({ type: "SET_NEWS_MAP_MODE", mode });
  }

  if (geoArticles.length === 0) return null;

  return (
    <>
      {state.newsMapMode === "pins" &&
        geoArticles.map((article) => (
          <Marker
            key={`news-${article.id}`}
            position={[article.location!.lat, article.location!.lng]}
            icon={createNewsMarker(article.sentiment ?? "neutral")}
          >
            <Popup maxWidth={320} minWidth={260}>
              <NewsPopupCard
                article={article}
                reactionCounts={state.newsReactions[article.id] ?? {}}
                userReaction={state.userReactions[article.id]}
                onReact={handleReaction}
              />
            </Popup>
          </Marker>
        ))
      }

      {state.newsMapMode === "heat" &&
        geoArticles.map((article) => {
          const color = getSentimentColor(article.sentiment ?? "neutral");
          return (
            <CircleMarker
              key={`news-heat-${article.id}`}
              center={[article.location!.lat, article.location!.lng]}
              radius={30}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.2,
                color,
                weight: 1.5,
                opacity: 0.4,
              }}
            >
              <Popup maxWidth={320} minWidth={260}>
                <NewsPopupCard
                  article={article}
                  reactionCounts={state.newsReactions[article.id] ?? {}}
                  userReaction={state.userReactions[article.id]}
                  onReact={handleReaction}
                />
              </Popup>
            </CircleMarker>
          );
        })
      }

      <NewsSentimentLegend
        articles={geoArticles}
        reactionCounts={state.newsReactions}
        mode={state.newsMapMode}
        onModeChange={handleModeChange}
      />
    </>
  );
}
```

**Important note:** `NewsSentimentLegend` uses absolute positioning (Tailwind `absolute bottom-3 right-3`) so it renders correctly as a map overlay even though it's a child of `<MapContainer>`. This follows the same pattern as the existing category legend in `ServiceMapView.tsx:132-140`.

**Step 2: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/news/NewsMapOverlay.tsx
git commit -m "feat(news): add NewsMapOverlay with pin and heat map modes"
```

---

## Task 8: Create NewsMapToggle and integrate into ServiceMapView

**Files:**
- Create: `montgomery-navigator/src/components/app/news/NewsMapToggle.tsx`
- Modify: `montgomery-navigator/src/components/app/services/ServiceMapView.tsx:68-157`

**Step 1: Create the toggle switch component**

```typescript
import { Newspaper } from "lucide-react";

interface NewsMapToggleProps {
  active: boolean;
  onToggle: () => void;
  articleCount: number;
}

export function NewsMapToggle({ active, onToggle, articleCount }: NewsMapToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
        active
          ? "bg-amber-500 text-white shadow-amber-500/25"
          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
      }`}
    >
      <Newspaper className="w-3.5 h-3.5" />
      {active ? "✕ Hide" : "📰"} What's Happening
      {articleCount > 0 && (
        <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
          ({articleCount})
        </span>
      )}
    </button>
  );
}
```

**Step 2: Integrate NewsMapOverlay + NewsMapToggle into ServiceMapView**

In `ServiceMapView.tsx`, add the following changes:

Add imports after the existing imports (line 12):
```typescript
import { NewsMapOverlay } from "../news/NewsMapOverlay";
import { NewsMapToggle } from "../news/NewsMapToggle";
import { filterGeolocatedArticles } from "@/lib/newsMapMarkers";
```

Add the news article count calculation inside the component function (after `const visiblePoints` around line 64):
```typescript
  const geolocatedNewsCount = filterGeolocatedArticles(state.newsArticles).length;
```

Add the toggle button in the header bar (after the Neighborhood Health button, around line 88):
```typescript
          <NewsMapToggle
            active={state.newsMapVisible}
            onToggle={() => dispatch({ type: "TOGGLE_NEWS_MAP" })}
            articleCount={geolocatedNewsCount}
          />
```

Add the overlay inside `<MapContainer>` (after `{showNeighborhood && <NeighborhoodOverlay />}`, around line 129):
```typescript
            {state.newsMapVisible && <NewsMapOverlay />}
```

**Step 3: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 4: Verify the app runs**

```bash
cd montgomery-navigator && npm run dev
```

Open browser, navigate to Services → Map, verify the toggle appears and clicking it doesn't crash (no geolocated articles yet so overlay will be empty).

**Step 5: Commit**

```bash
git add montgomery-navigator/src/components/app/news/NewsMapToggle.tsx montgomery-navigator/src/components/app/services/ServiceMapView.tsx
git commit -m "feat(map): integrate news overlay toggle into ServiceMapView"
```

---

## Task 9: Create backend geolocation module

**Files:**
- Create: `scripts/processors/geocode_news.py`

**Step 1: Create the geocode module**

This module extracts location mentions from news article titles/excerpts and resolves them to lat/lng using Bright Data's Google Maps SERP API.

```python
"""Geocode news articles using Bright Data Google Maps SERP.

Extracts location mentions from article text and resolves
them to lat/lng coordinates within Montgomery, AL.
"""

import logging
import re
import time

from scripts.bright_data_client import serp_search

logger = logging.getLogger("geocode_news")

# Montgomery, AL bounding box for validation
MONTGOMERY_BOUNDS = {
    "lat_min": 32.20,
    "lat_max": 32.55,
    "lng_min": -86.55,
    "lng_max": -86.10,
}

# Known Montgomery neighborhoods for keyword extraction
MONTGOMERY_NEIGHBORHOODS = [
    "Downtown", "Midtown", "Old Cloverdale", "Cloverdale",
    "Capitol Heights", "Garden District", "Highland Park",
    "Woodmere", "Dalraida", "Normandale", "Chisholm",
    "Arrowhead", "McGehee", "Hampstead", "Pike Road",
    "Prattville", "Wetumpka", "Millbrook", "Eastdale",
    "West Montgomery", "East Montgomery", "Carmichael",
    "Vaughn", "Catoma", "Old Town", "Maxwell", "Gunter",
]

# Street / landmark patterns
LOCATION_PATTERNS = [
    r"\b(\d{2,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Pkwy|Hwy))\b",
    r"\b((?:North|South|East|West)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b",
    r"\b(I-\d+|Interstate\s+\d+|US\s+\d+|Highway\s+\d+)\b",
]


def extract_location_mentions(title: str, excerpt: str) -> list[str]:
    """Extract potential location mentions from article text."""
    text = f"{title} {excerpt}"
    mentions: list[str] = []

    for neighborhood in MONTGOMERY_NEIGHBORHOODS:
        if neighborhood.lower() in text.lower():
            mentions.append(neighborhood)

    for pattern in LOCATION_PATTERNS:
        matches = re.findall(pattern, text)
        mentions.extend(matches)

    return list(dict.fromkeys(mentions))[:3]


def is_within_montgomery(lat: float, lng: float) -> bool:
    """Check if coordinates fall within Montgomery metro area."""
    return (
        MONTGOMERY_BOUNDS["lat_min"] <= lat <= MONTGOMERY_BOUNDS["lat_max"]
        and MONTGOMERY_BOUNDS["lng_min"] <= lng <= MONTGOMERY_BOUNDS["lng_max"]
    )


def geocode_location(location_text: str) -> dict | None:
    """Resolve a location string to coordinates via Google Maps SERP.

    Returns {"lat": float, "lng": float, "address": str, "neighborhood": str}
    or None if not found / not in Montgomery.
    """
    query = f"{location_text} Montgomery Alabama"
    body = serp_search(query, search_type="maps")

    if not body:
        return None

    results = body.get("results", [])
    if not results:
        return None

    top = results[0]

    coords = top.get("gps_coordinates") or top.get("coordinates") or {}
    lat = coords.get("latitude") or coords.get("lat")
    lng = coords.get("longitude") or coords.get("lng")

    if lat is None or lng is None:
        return None

    lat, lng = float(lat), float(lng)

    if not is_within_montgomery(lat, lng):
        logger.info("Coordinates outside Montgomery: %s → (%s, %s)", location_text, lat, lng)
        return None

    address = top.get("address") or top.get("formatted_address") or ""
    neighborhood = _match_neighborhood(location_text, address)

    return {
        "lat": lat,
        "lng": lng,
        "address": address,
        "neighborhood": neighborhood,
    }


def _match_neighborhood(query: str, address: str) -> str:
    """Try to match a neighborhood name from query or address."""
    combined = f"{query} {address}".lower()
    for name in MONTGOMERY_NEIGHBORHOODS:
        if name.lower() in combined:
            return name
    return "Montgomery"


def geocode_articles(articles: list[dict], max_geocode: int = 20) -> list[dict]:
    """Add location data to articles that don't have it yet.

    Extracts location mentions from title/excerpt, geocodes the first
    match, and stores the result on the article.

    Args:
        articles: List of article dicts (mutated in place).
        max_geocode: Max number of geocode API calls per run.

    Returns:
        The same list with location fields populated.
    """
    geocoded_count = 0

    for article in articles:
        if article.get("location") is not None:
            continue
        if geocoded_count >= max_geocode:
            break

        title = article.get("title", "")
        excerpt = article.get("excerpt", "")
        mentions = extract_location_mentions(title, excerpt)

        if not mentions:
            article["location"] = None
            continue

        location = None
        for mention in mentions:
            geocoded_count += 1
            location = geocode_location(mention)
            if location:
                break
            time.sleep(1)

        article["location"] = location
        if location:
            logger.info("Geolocated: '%s' → %s", title[:50], location["neighborhood"])

    located = sum(1 for a in articles if a.get("location"))
    logger.info("Geocoded %d articles (%d/%d have location)", geocoded_count, located, len(articles))

    return articles
```

**Step 2: Verify the module imports cleanly**

```bash
cd C:/Users/User/Projects/Pegasus && python -c "from scripts.processors.geocode_news import extract_location_mentions; print('OK')"
```

**Step 3: Commit**

```bash
git add scripts/processors/geocode_news.py
git commit -m "feat(scraper): add geocode_news module for news article geolocation"
```

---

## Task 10: Integrate geocoding into the news scraper pipeline

**Files:**
- Modify: `scripts/triggers/trigger_news.py:71-91`
- Modify: `scripts/bright_data_client.py:191-213`

**Step 1: Add Google Maps search type to serp_search**

In `bright_data_client.py`, update the `serp_search` function to support `search_type="maps"`. The current function hardcodes Google News search. Add a maps-specific branch:

After the existing `serp_search` function (line 191-213), add a new function:

```python
def serp_maps_search(query: str) -> dict | None:
    """Run a Google Maps search via SERP API. Returns parsed results or None."""
    try:
        with _make_client() as client:
            # Use the raw SERP request for maps search type
            import requests
            url = f"https://www.google.com/maps/search/{requests.utils.quote(query)}"
            result = client.search.google(
                query=query,
                location="Montgomery, AL",
                num_results=5,
            )
            if result.data:
                return {"results": result.data, "total": result.total_found}
    except Exception as e:
        logger.error("Maps SERP failed for '%s': %s", query, e)
    return None
```

Then update `geocode_news.py` to use `serp_maps_search` instead of `serp_search`:

In `scripts/processors/geocode_news.py`, change the import:
```python
from scripts.bright_data_client import serp_maps_search
```

And in the `geocode_location` function, change `serp_search(query, search_type="maps")` to `serp_maps_search(query)`.

**Step 2: Add geocode step to trigger_news.py**

In `trigger_news.py`, add the import (after line 18):
```python
from scripts.processors.geocode_news import geocode_articles
```

In `run_news_pipeline()`, add the geocode step after enrichment (after line 83, before loading existing articles):

```python
    # Geocode articles with location mentions
    print("\nGeocoding articles...")
    geocode_articles(articles, max_geocode=20)
```

**Step 3: Run the pipeline to verify it works**

```bash
cd C:/Users/User/Projects/Pegasus && python -m scripts.triggers.trigger_news --poll --skip-fulltext
```

Verify: articles in `news_feed.json` now have `"location"` fields (some null, some with lat/lng).

**Step 4: Commit**

```bash
git add scripts/triggers/trigger_news.py scripts/bright_data_client.py scripts/processors/geocode_news.py
git commit -m "feat(scraper): integrate geocoding into news pipeline"
```

---

## Task 11: Add localStorage persistence for reactions

**Files:**
- Create: `montgomery-navigator/src/lib/newsReactionStore.ts`
- Modify: `montgomery-navigator/src/components/app/news/NewsMapOverlay.tsx`

**Step 1: Create the localStorage persistence module**

```typescript
import type { ReactionType } from "./types";

const STORAGE_KEY = "montgomery-news-reactions";

interface StoredReactions {
  reactions: Record<string, Record<ReactionType, number>>;
  userReactions: Record<string, ReactionType>;
}

export function loadStoredReactions(): StoredReactions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reactions: {}, userReactions: {} };
    return JSON.parse(raw) as StoredReactions;
  } catch {
    return { reactions: {}, userReactions: {} };
  }
}

export function saveReactions(data: StoredReactions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
```

**Step 2: Integrate persistence into NewsMapOverlay**

In `NewsMapOverlay.tsx`, add an effect to load reactions on mount and save on change:

Add imports:
```typescript
import { useEffect } from "react";
import { loadStoredReactions, saveReactions } from "@/lib/newsReactionStore";
```

Add effect at the top of the component function (after `const { state, dispatch } = useApp()`):
```typescript
  // Load reactions from localStorage on mount
  useEffect(() => {
    const stored = loadStoredReactions();
    if (Object.keys(stored.reactions).length > 0) {
      // Hydrate state from localStorage
      for (const [articleId, reaction] of Object.entries(stored.userReactions)) {
        dispatch({ type: "SET_ARTICLE_REACTION", articleId, reaction });
      }
    }
  }, []);

  // Save reactions to localStorage on change
  useEffect(() => {
    if (Object.keys(state.newsReactions).length > 0) {
      saveReactions({
        reactions: state.newsReactions,
        userReactions: state.userReactions,
      });
    }
  }, [state.newsReactions, state.userReactions]);
```

**Step 3: Verify compilation**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add montgomery-navigator/src/lib/newsReactionStore.ts montgomery-navigator/src/components/app/news/NewsMapOverlay.tsx
git commit -m "feat(news): add localStorage persistence for reactions"
```

---

## Task 12: Load news articles in ServiceMapView

**Files:**
- Modify: `montgomery-navigator/src/components/app/services/ServiceMapView.tsx`

**Step 1: Ensure news articles are loaded when map view opens**

The news articles need to be fetched for the overlay to have data. Add a load effect to `ServiceMapView`:

Add import:
```typescript
import { fetchNewsArticles } from "@/lib/newsService";
```

Add effect (after the existing `useEffect` that loads service points, around line 44-54):
```typescript
  useEffect(() => {
    if (state.newsArticles.length === 0) {
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) {
          dispatch({ type: "SET_NEWS_ARTICLES", articles });
        }
      });
    }
  }, []);
```

**Step 2: Verify compilation and test**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/services/ServiceMapView.tsx
git commit -m "feat(map): load news articles when service map view opens"
```

---

## Task 13: Add mock geolocated articles for testing

**Files:**
- Create: `scripts/add_mock_locations.py` (one-time utility script)

**Step 1: Create a script that patches a few articles with location data for testing**

This is a temporary dev utility to add location data to a few existing articles so the frontend overlay can be tested before the full geocoding pipeline is run.

```python
"""Add mock location data to a few news articles for frontend testing.

Run once: python scripts/add_mock_locations.py
"""

import json
from pathlib import Path

NEWS_PATH = Path(__file__).resolve().parent.parent / "montgomery-navigator" / "public" / "data" / "news_feed.json"

MOCK_LOCATIONS = [
    {"lat": 32.3792, "lng": -86.3077, "neighborhood": "Downtown", "address": "101 Dexter Ave, Montgomery, AL"},
    {"lat": 32.3607, "lng": -86.2717, "neighborhood": "Dalraida", "address": "3780 Atlanta Hwy, Montgomery, AL"},
    {"lat": 32.3460, "lng": -86.3395, "neighborhood": "Cloverdale", "address": "1048 Felder Ave, Montgomery, AL"},
    {"lat": 32.4038, "lng": -86.2549, "neighborhood": "Eastdale", "address": "7201 Eastchase Pkwy, Montgomery, AL"},
    {"lat": 32.3736, "lng": -86.3483, "neighborhood": "Midtown", "address": "2735 Zelda Rd, Montgomery, AL"},
    {"lat": 32.3856, "lng": -86.2364, "neighborhood": "McGehee", "address": "4301 McGehee Rd, Montgomery, AL"},
    {"lat": 32.3500, "lng": -86.2850, "neighborhood": "Capitol Heights", "address": "405 S Court St, Montgomery, AL"},
    {"lat": 32.3920, "lng": -86.3180, "neighborhood": "Normandale", "address": "1015 Norman Bridge Rd, Montgomery, AL"},
]


def add_mock_locations() -> None:
    with open(NEWS_PATH) as f:
        data = json.load(f)

    articles = data.get("articles", [])
    patched = 0

    for i, article in enumerate(articles):
        if patched >= len(MOCK_LOCATIONS):
            break
        if article.get("location") is not None:
            continue
        article["location"] = MOCK_LOCATIONS[patched]
        patched += 1

    with open(NEWS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Patched {patched} articles with mock locations")


if __name__ == "__main__":
    add_mock_locations()
```

**Step 2: Run the script**

```bash
cd C:/Users/User/Projects/Pegasus && python scripts/add_mock_locations.py
```

Expected: "Patched 8 articles with mock locations"

**Step 3: Verify the frontend shows markers**

```bash
cd montgomery-navigator && npm run dev
```

Open browser → Services → Map → click "What's Happening" toggle → 8 news markers should appear.

**Step 4: Commit**

```bash
git add scripts/add_mock_locations.py montgomery-navigator/public/data/news_feed.json
git commit -m "feat(dev): add mock geolocated articles for frontend testing"
```

---

## Task 14: Final integration test and cleanup

**Files:**
- All modified files from prior tasks

**Step 1: Run full compilation check**

```bash
cd montgomery-navigator && npx tsc --noEmit
```

**Step 2: Run the dev server and test all flows**

```bash
cd montgomery-navigator && npm run dev
```

Test checklist:
- [ ] Services tab loads with map
- [ ] "What's Happening" toggle appears next to "Neighborhood Health" toggle
- [ ] Clicking toggle shows news markers on map (8 mock locations)
- [ ] Clicking a news marker opens floating popup card
- [ ] Popup shows headline, sentiment badge, source, time
- [ ] Emoji reaction buttons work (click to react)
- [ ] Reaction persists after toggling overlay off/on
- [ ] Legend appears bottom-right with sentiment counts and mode toggle
- [ ] Switching between Pins and Heat modes works
- [ ] News tab is gone from sidebar
- [ ] News tab is gone from mobile nav
- [ ] Other tabs (Services, Career Growth) still work
- [ ] Navigating directly to `/app/services` works

**Step 3: Run lint**

```bash
cd montgomery-navigator && npx eslint src/ --max-warnings=0 || true
```

Fix any lint errors found.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(news): complete news sentiment map overlay integration"
```
