# Montgomery Navigator — Frontend

Real-time community intelligence platform for Montgomery, Alabama. Aggregates news, jobs, housing, and government services into an interactive map with sentiment analysis and community engagement.

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server (runs on localhost:8080)
npm run dev

# Build for production
npm build
```

## News Sentiment Map

The centerpiece feature integrating real-time news with community sentiment tracking across Montgomery neighborhoods.

### Map Visualization

**Location**: `src/components/app/news/` + `src/lib/newsMapMarkers.ts`

Two map display modes toggle from the sidebar:
- **Pins mode**: Individual sentiment-colored markers (green=positive, yellow=neutral, red=negative)
- **Heat mode**: Overlapping circle markers showing sentiment density

All articles are 100% geolocated via a 3-tier geocoding strategy (see [Geocoding](#geocoding) below).

Click any marker to open a popup card with:
- Article title, excerpt, and publication date
- Sentiment badge (color-coded)
- Category tag
- Neighborhood (if available)
- Reaction buttons (5 types) with community counts
- Link to full article

**Key Components**:
- `NewsMapOverlay.tsx` — Renders Leaflet markers/circles, manages popup state, integrates reactions from localStorage
- `NewsMapToggle.tsx` — Button to toggle map visibility in the top bar
- `newsMapMarkers.ts` — Marker factories, sentiment color mapping, cluster aggregation

### Sidebar Panel

**Location**: `src/components/app/news/NewsSidebarPanel.tsx` + related components

Fixed right-side panel (320px) showing article list with sorting and filtering:

**Controls**:
- **Map mode**: Toggle between pins/heat visualization
- **Sort**: Latest (by scraped date) or Trending (by engagement = reactions + comments)
- **Filter**: By category (All, General, Dev, Gov, Community, Events)
- **Count**: Display article count

**Article Rows**:
- Click to expand and reveal inline comment section
- Each row shows sentiment badge, reaction count, comment count
- Navigation triggers animated flyTo on map

**Key Components**:
- `SidebarArticleRow.tsx` — Individual article row with metadata
- `NewsCommentSection.tsx` — Inline comment thread UI
- `NewsAggregations.ts` — Trending calculation logic (sum reactions + comments per article)

### Admin Dashboard

**Route**: `/admin`

Protected view for elected officials and city administrators showing aggregated sentiment, community hotspots, and civic feedback.

**Panels**:

1. **Mayor's Brief** — Card showing:
   - Total article count
   - Positive/negative sentiment ratio
   - Total community reactions
   - Top concern (category with most negative sentiment)

2. **Sentiment Overview** — Dual charts:
   - Pie: Overall sentiment distribution
   - Stacked bar: Sentiment breakdown by article category

3. **Hot Spots** — Table of neighborhoods ranked by:
   - Article count
   - Average sentiment
   - Reaction engagement

4. **Comment Feed** — Chronological thread of all community comments with:
   - Article title (linked to sidebar)
   - Citizen name and avatar
   - Comment text
   - Timestamp

5. **Data Export** — Single-click JSON download of:
   - All comments with metadata
   - All reaction counts per article
   - Article summary (id, title, category, sentiment)
   - Export timestamp

6. **Geolocated Articles** — Metric card showing coverage (e.g., "247/247 articles")

**Key Components**:
- `AdminDashboard.tsx` — Page layout, loads all persisted data
- `SentimentOverview.tsx` — Recharts pie/bar charts
- `HotSpotsPanel.tsx` — Neighborhood aggregation table
- `MayorsBrief.tsx` — Summary statistics card
- `CommentFeed.tsx` — Chronological comment list
- `ExportControls.tsx` — JSON download trigger

### Community Engagement

**Reactions** (persistent in localStorage):

Five reaction types per article:
- 👍 Thumbs Up
- 👎 Thumbs Down
- ❤️ Heart
- 😢 Sad
- 😡 Angry

Users can react once per article. Reaction counts aggregate across all users.

**Location**: `src/lib/newsReactionStore.ts`
- `loadStoredReactions()` — Fetch reactions and user selections from localStorage
- `saveReactions()` — Persist after user interaction
- Data structure: `{ reactions: {articleId: {reactionType: count}}, userReactions: {articleId: reactionType} }`

**Comments** (persistent in localStorage):

Threaded comments tied to articles. Citizens can:
- Add comments with a name and color-coded avatar (initials)
- See timestamp and all previous comments in chronological order
- Export all comments via admin dashboard

**Location**: `src/lib/newsCommentStore.ts`
- `loadStoredComments()` — Fetch comment array from localStorage
- `saveComment()` — Append new comment
- `saveAllComments()` — Sync after state changes
- `exportCommentsAsJson()` — Trigger JSON download with comments + reactions + articles

### Geocoding

**Backend Script**: `scripts/processors/geocode_news.py`

All articles are guaranteed to have map coordinates (100% coverage) via 3-tier strategy:

| Tier | Trigger | Method | Coverage |
|------|---------|--------|----------|
| 1 | Specific location (neighborhood, street, landmark) | Bright Data Google Maps SERP API | High precision — actual address coordinates |
| 2 | City-level mention ("Montgomery", "ASU") | Jittered city center | Medium — spread across downtown to avoid stacking |
| 3 | All remaining articles (by definition Montgomery-relevant) | Jittered city center | Medium — deterministic hash ensures consistency |

**Implementation Details**:
- **28 neighborhoods** recognized (Downtown, Midtown, Old Cloverdale, etc.)
- **20+ landmarks** (Riverwalk, State Capitol, ASU Stadium, Maxwell AFB, etc.)
- **Regex patterns** for streets (e.g., "1234 Dexter Ave"), highways (I-85, US-231)
- **Jittering**: Uses MD5 hash of article ID to generate deterministic angle/radius, spreading pins across downtown without randomness
- **Bounding box validation**: All SERP results must fall within Montgomery metro (32.20–32.55 lat, -86.55 to -86.10 lng)
- **API rate limiting**: Max 500 SERP calls per cycle (configurable)

**Result**: Visitor can see the entire news feed on the map with no missing articles, no mock data.

## Data Structure

### NewsArticle (Frontend Type)

Located in `src/lib/types.ts`:

```typescript
export interface NewsArticle {
  id: string;                    // Stable hash of title + source
  title: string;
  excerpt: string;               // First 200 chars
  body: string;                  // Full article text (2000 char max)
  source: string;                // "CNN", "Yahoo News", etc.
  sourceUrl: string;             // Link to full article
  imageUrl?: string | null;      // Featured image (from SERP or Bright Data crawl)
  category: string;              // "general", "development", "government", "community", "events"
  publishedAt: string;           // ISO 8601 timestamp
  scrapedAt: string;             // ISO 8601 timestamp (fetch time)
  upvotes: number;               // Legacy (not used in UI)
  downvotes: number;             // Legacy (not used in UI)
  commentCount: number;          // Legacy (populated from state.newsComments)
  sentiment?: "positive" | "negative" | "neutral";
  sentimentScore?: number;       // -1 to +1
  summary?: string;              // Generated via LLM (optional)
  misinfoRisk?: number;          // 0-1 score (optional)
  location?: NewsLocation | null; // {lat, lng, address, neighborhood}
}

export interface NewsLocation {
  lat: number;
  lng: number;
  address?: string;
  neighborhood?: string;
}
```

### Comment & Reaction Data

**Comments** (localStorage key: `montgomery-news-comments`):
```typescript
export interface NewsComment {
  id: string;              // UUID
  articleId: string;       // Links to NewsArticle.id
  citizenId: string;       // UUID (persistent per browser)
  citizenName: string;     // User-entered name
  avatarInitials: string;  // First 2 chars
  avatarColor: string;     // Hex color
  content: string;         // Comment text
  createdAt: string;       // ISO 8601
}
```

**Reactions** (localStorage key: `montgomery-news-reactions`):
```typescript
{
  "reactions": {
    "article-id-1": {
      "thumbs_up": 3,
      "heart": 1,
      "angry": 0,
      ...
    }
  },
  "userReactions": {
    "article-id-1": "thumbs_up"  // This user's single reaction
  }
}
```

## Architecture

### State Management

Global app state in `src/lib/appContext.tsx`:
- `newsArticles` — All articles from SSE stream
- `newsComments` — Comments in state (synced from localStorage)
- `newsReactions` — Reaction counts per article
- `userReactions` — This user's reaction per article
- `newsMapMode` — Current display mode ("pins" | "heat")

Actions:
- `SET_ARTICLE_REACTION` — Toggle user reaction + update counts
- `SET_NEWS_COMMENT` — Add comment to state
- `SET_NEWS_COMMENTS` — Bulk load from localStorage on mount

### Component Hierarchy

```
CommandCenter (main app shell)
├─ TopBar (global header with language/profile)
├─ FlowSidebar (left nav with "Admin Dashboard" button)
├─ ServicesView (map container)
│  └─ ServiceMapView (Leaflet map)
│     ├─ NewsMapOverlay (renders pins/heat + popups)
│     ├─ NewsSidebarPanel (right-side article list)
│     └─ NewsMapToggle (in top bar)
└─ ContextPanel (right-side info panel for services)

AdminDashboard (separate route)
├─ MayorsBrief
├─ SentimentOverview (Recharts)
├─ HotSpotsPanel
├─ CommentFeed
├─ ExportControls
└─ Geolocated Articles metric
```

### Data Flow

1. **On mount**: SSE listener streams new articles from backend
2. **NewsMapOverlay mounts**: Load reactions + comments from localStorage
3. **User interaction**:
   - Clicks reaction → dispatch `SET_ARTICLE_REACTION` → save to localStorage
   - Adds comment → dispatch `SET_NEWS_COMMENT` → save to localStorage
4. **On state change**: useEffect syncs to localStorage
5. **Admin dashboard**: Loads localStorage data directly (bypasses SSE)

## File Structure

```
src/
├─ lib/
│  ├─ newsMapMarkers.ts          # Sentiment colors, marker factories
│  ├─ newsReactionStore.ts       # localStorage for reactions
│  ├─ newsCommentStore.ts        # localStorage for comments
│  ├─ newsAggregations.ts        # Trending, neighborhood calcs
│  ├─ appContext.tsx             # Global state + dispatch
│  ├─ types.ts                   # NewsArticle, NewsComment, etc.
│  └─ newsService.ts             # formatRelativeTime(), etc.
├─ components/
│  └─ app/
│     ├─ news/                   # News UI components
│     │  ├─ NewsMapOverlay.tsx
│     │  ├─ NewsMapToggle.tsx
│     │  ├─ NewsPopupCard.tsx
│     │  ├─ NewsSidebarPanel.tsx
│     │  ├─ SidebarArticleRow.tsx
│     │  ├─ NewsCommentSection.tsx
│     │  ├─ NewsSentimentLegend.tsx
│     │  ├─ NewsCard.tsx
│     │  ├─ NewsFilterBar.tsx
│     │  ├─ NewsCategoryTabs.tsx
│     │  └─ ...
│     ├─ admin/                  # Admin dashboard
│     │  ├─ SentimentOverview.tsx
│     │  ├─ HotSpotsPanel.tsx
│     │  ├─ MayorsBrief.tsx
│     │  ├─ CommentFeed.tsx
│     │  └─ ExportControls.tsx
│     ├─ FlowSidebar.tsx         # Main left nav (with /admin link)
│     ├─ TopBar.tsx
│     ├─ MobileNav.tsx
│     └─ ...
└─ pages/
   ├─ CommandCenter.tsx          # Main app shell
   ├─ AdminDashboard.tsx         # /admin route
   └─ ...
```

## Styling

- **Tailwind CSS** for layout and responsive design
- **shadcn/ui** components (Card, ScrollArea, etc.)
- **Sentiment colors** (consistent across map and admin): green (#22c55e), yellow (#eab308), red (#ef4444)
- **Reaction emojis** as interactive buttons with hover states

## Future Enhancements

- Persistence to backend database (currently localStorage-only)
- Comment moderation and flagging
- Temporal trend charts (sentiment over time)
- Neighborhood-level alerts for civic issues
- Integration with city311 for issue escalation
