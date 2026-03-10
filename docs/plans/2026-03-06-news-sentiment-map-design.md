# News Sentiment Map Overlay — Design

**Date:** 2026-03-06
**Branch:** `news/sentiment`
**Status:** Approved

## Goal

Move news from a standalone sidebar tab into an interactive map overlay on the Services map. Show geolocated news articles as markers with community sentiment reactions, providing a "What's Happening in Montgomery" experience.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Geolocation method | Bright Data Google Maps SERP API (scraper-side) | Already have credentials; one-time cost per article; no runtime API calls |
| Marker style | Clustered pins + heat zone (both, user picks) | Pins for granularity, heat for overview; togglable sub-option |
| Popup style | Floating card overlay | Newsletter-like feel; dismissible; shows headline + reactions |
| Sentiment collection | Thumbs up/down + emoji reactions (heart, sad, angry) | Binary primary + richer secondary signal; trim after testing |
| Modularity | Dedicated NewsMapOverlay component | Self-contained leaf component; other branches follow same pattern |
| News tab removal | Remove from FlowSidebar + MobileNav | News lives on the map now, not a separate tab |

## Data Model

### Backend — `news_feed.json` article additions

```json
{
  "location": {
    "lat": 32.3791,
    "lng": -86.3077,
    "neighborhood": "Downtown",
    "address": "101 Dexter Ave, Montgomery, AL"
  }
}
```

Articles that can't be geolocated get `"location": null`.

### Frontend — TypeScript types

```typescript
// Add to NewsArticle
location?: {
  lat: number;
  lng: number;
  neighborhood: string;
  address: string;
} | null;

reactions?: Record<ReactionType, number>;
userReaction?: ReactionType | null;

// New type
type ReactionType = "thumbs_up" | "thumbs_down" | "heart" | "sad" | "angry";
```

### New state fields on AppState

```typescript
newsMapVisible: boolean;        // overlay toggle
newsMapMode: "pins" | "heat";   // visualization mode
newsReactions: Record<string, Record<ReactionType, number>>;
userReactions: Record<string, ReactionType>;
```

### New actions

- `TOGGLE_NEWS_MAP` — show/hide overlay
- `SET_NEWS_MAP_MODE` — switch pins/heat
- `SET_ARTICLE_REACTION` — user reacts to article

## Backend — Geolocation Pipeline

### New module: `scripts/processors/geocode_news.py`

**Pipeline step (after enrichment, before save):**

1. Filter articles missing `location` field
2. Extract location keywords from title + excerpt (streets, neighborhoods, landmarks)
3. Call Bright Data Google Maps SERP for `"{location} Montgomery Alabama"`
4. Parse response: `gps_coordinates.latitude/longitude`, `address`
5. Map coordinates to neighborhood via polygon lookup
6. Set `location` object on article (or `null` if no match)

**Cost control:**
- Only geocode new articles (skip if `location` already exists)
- Max 20 geocode calls per scrape run
- Cache successful geocode results

**Integration:** Called from `trigger_news.py` after `enrich_article()`.

## Frontend — Component Architecture

### New components (`components/app/news/`)

| Component | Responsibility |
|-----------|---------------|
| `NewsMapOverlay.tsx` | Leaflet layer rendering news markers inside `<MapContainer>`. Self-contained, no coupling to service components. |
| `NewsMapToggle.tsx` | Toggle switch in map header: "What's Happening in Montgomery" |
| `NewsPopupCard.tsx` | Floating card on marker click: headline, image, sentiment, reactions, source link |
| `NewsSentimentLegend.tsx` | Bottom-left legend: sentiment color scale + aggregate reaction counts |
| `NewsClusterMarker.tsx` | Clustered marker with count badge, colored by aggregate sentiment |
| `NewsHeatLayer.tsx` | Neighborhood choropleth shading by news density/sentiment |

### Modified components

| Component | Change |
|-----------|--------|
| `FlowSidebar.tsx` | Remove "News" from NAV_ITEMS |
| `MobileNav.tsx` | Remove "news" tab |
| `ServiceMapView.tsx` | Add `NewsMapOverlay` + `NewsMapToggle` as children inside MapContainer |
| `appContext.tsx` | Add new state fields + actions |
| `types.ts` | Add location, ReactionType, updated AppState |

### Removed views

- `AppView` union: remove `"news"` (or keep for backwards compat if other code references it)
- `CommandCenter.tsx`: remove `{currentView === "news" && <NewsView />}` conditional

## UX Flow

1. User opens **Services** tab → sees the map
2. Map header shows toggle: **"What's Happening in Montgomery"** (off by default)
3. Toggle ON → news markers appear:
   - Newspaper icon pins colored by sentiment (green=positive, yellow=neutral, red=negative)
   - Nearby articles cluster with count badge
   - Sentiment legend appears bottom-left
4. Click a marker → floating card popup:
   - Hero image (if available)
   - Headline + source + time ago
   - Sentiment badge
   - Reaction bar: thumbs_up, thumbs_down, heart, sad, angry
   - "Read full article" external link
5. Sub-toggle: switch between **Pins** and **Heat Map** views
6. Legend updates with aggregate sentiment for visible articles

## Modularity

- `NewsMapOverlay` is a leaf component — imports only Leaflet primitives
- Rendered inside `<MapContainer>` via boolean prop: `showNewsOverlay={state.newsMapVisible}`
- State slice is isolated: `newsMapVisible`, `newsMapMode`, `newsReactions`, `userReactions`
- Pattern proven by existing `NeighborhoodOverlay` component
- Other branches add overlays by creating `XxxMapOverlay` + toggle, no conflicts

## File Tree (new/modified)

```
scripts/
  processors/
    geocode_news.py          # NEW — geolocation enrichment
  triggers/
    trigger_news.py          # MODIFIED — add geocode step

montgomery-navigator/src/
  lib/
    types.ts                 # MODIFIED — location, ReactionType, AppState
    appContext.tsx            # MODIFIED — new state + actions
  components/app/
    FlowSidebar.tsx          # MODIFIED — remove news tab
    MobileNav.tsx            # MODIFIED — remove news tab
    news/
      NewsMapOverlay.tsx     # NEW — map layer
      NewsMapToggle.tsx      # NEW — toggle switch
      NewsPopupCard.tsx      # NEW — floating card
      NewsSentimentLegend.tsx # NEW — legend
      NewsClusterMarker.tsx  # NEW — cluster markers
      NewsHeatLayer.tsx      # NEW — heat visualization
    services/
      ServiceMapView.tsx     # MODIFIED — render overlay + toggle
  pages/
    CommandCenter.tsx        # MODIFIED — remove news view conditional
```
