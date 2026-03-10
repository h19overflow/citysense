# News Page Design — `/app/news`

## Summary

A new view in CommandCenter with two tabs: a dedicated news-only map and a newspaper-style editorial grid. Both read from `news_feed.json` via existing state management.

## Tab 1: Map

- Dedicated Leaflet map showing only news markers (no service points)
- Reuses `NewsMapOverlay` (pin/heat modes), `NewsSidebarPanel`, fly-to logic
- Pin/heat toggle in header
- Article sidebar with neighborhood grouping and article selection

## Tab 2: Newsletter

- **Hero section**: Largest/most-recent article with full-width image, title, excerpt, metadata
- **Two-column editorial grid**: Left column medium cards, right column compact rows
- Category tabs + search bar for filtering (reuses existing filter utilities)
- Sentiment badges, source labels, timestamps from existing patterns

## Components

| Component | Path | Description |
|---|---|---|
| NewsPage | `components/app/news/NewsPage.tsx` | Tab container with Map/Newsletter toggle |
| NewsMapTab | `components/app/news/NewsMapTab.tsx` | News-only Leaflet map panel |
| NewsletterTab | `components/app/news/NewsletterTab.tsx` | Newspaper-style editorial grid |
| HeroArticle | `components/app/news/HeroArticle.tsx` | Featured article hero card |

## Modified Files

| File | Change |
|---|---|
| `CommandCenter.tsx` | Add `"news"` to VALID_VIEWS, render NewsPage |
| `MobileNav.tsx` | Add news tab icon |
| `FlowSidebar.tsx` | Add news nav link |
| `lib/types.ts` | Add `"news"` to AppView union if needed |

## Data Flow

Same pipeline: `news_feed.json` → `fetchNewsArticles()` → app context state → components. No backend changes.
