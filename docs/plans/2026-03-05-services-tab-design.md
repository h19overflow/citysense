# Services Tab — Design

**Date:** 2026-03-05
**Context:** New "Services" tab within Command Center, accessible via sidebar navigation and mobile bottom nav

---

## Decision

**Concept:** Personalized City Intelligence — not just a map, but an AI-driven civic action planner that surfaces relevant services based on user profile and connects them to actionable next steps.

**Layout:** Map top (60%), Civic Action Cards bottom (40%) with category filter chips between them.

**Data:** Real ArcGIS REST API calls to Montgomery's public feature services. No mocking.

**Differentiation from Google Maps:**
1. Profile-driven pins — only shows services relevant to the user's situation
2. Action-oriented details — pin popups include "Help me apply" / "Help me prepare" buttons that route to Chat with context
3. Civic Action Cards — AI-generated action plans based on profile (e.g., "You may qualify for Medicaid — nearest DHR office is 1.2mi away")
4. Cross-flow integration — services view adapts based on active flow (U1-U6)

---

## Layout

### Desktop

```
┌──────────────────────────────────────────────────────────────────┐
│  TopBar: MontgomeryAI                           [EN|ES] [👤]    │
├────────────┬─────────────────────────────┬───────────────────────┤
│ LEFT       │  CENTER AREA                │  RIGHT PANEL          │
│ SIDEBAR    │                             │                       │
│            │  [Category Filter Chips]    │  Pin Detail Card      │
│ [💬 Chat ] │  ┌───────────────────────┐  │  (when pin selected)  │
│ [📊 Svc  ] │  │                       │  │                       │
│ [📈 Career]│  │    LEAFLET MAP        │  │  - Name, address      │
│            │  │    (60% height)       │  │  - Category icon      │
│ ────────── │  │    Centered on        │  │  - Hours / phone      │
│            │  │    Montgomery, AL     │  │  - Distance from user │
│ Flow       │  │                       │  │  - [Help me prepare]  │
│ Stepper    │  └───────────────────────┘  │                       │
│            │                             │  ─────────────────     │
│ Quick Acts │  ┌───────────────────────┐  │                       │
│            │  │  CIVIC ACTION CARDS   │  │  Profile Summary      │
│ Docs       │  │  (40% height, scroll) │  │  Action Items         │
│            │  │                       │  │                       │
│            │  │  Profile-driven cards │  │                       │
│            │  │  with map links       │  │                       │
│            │  └───────────────────────┘  │                       │
└────────────┴─────────────────────────────┴───────────────────────┘
```

### Mobile

Bottom nav "Services" tab shows the same layout stacked vertically. Map takes full width, action cards scroll below. No right panel on mobile.

---

## Map Configuration

- **Library:** Leaflet via `react-leaflet` (free, no API key)
- **Tiles:** OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Center:** Montgomery, AL (32.3668, -86.3000)
- **Default Zoom:** 12
- **Markers:** Custom colored markers per category, clustered when zoomed out

---

## Category Filters

Toggle chips above the map. Each chip controls a map layer.

| Category | Icon | ArcGIS Source | Color |
|----------|------|---------------|-------|
| Health | Heart | Community Health Centers | #E74C3C |
| Education | GraduationCap | Education Facilities | #3498DB |
| Pharmacy | Pill | Pharmacies | #9B59B6 |
| Parks | Trees | Parks & Trails | #2ECC71 |
| Safety | Shield | Fire/Police Stations | #E67E22 |
| Shelters | Home | Tornado Shelters | #1ABC9C |
| Food Safety | UtensilsCrossed | Food Establishment Scores | #F39C12 |
| POI | MapPin | Points of Interest | #34495E |
| Parking | Car | Downtown Parking | #95A5A6 |

**Default:** Health + Education + Safety active on load.

---

## ArcGIS Data Fetching

All datasets are public REST endpoints. Query pattern:
```
https://services.arcgis.com/{orgId}/arcgis/rest/services/{layerName}/FeatureServer/0/query
  ?where=1%3D1
  &outFields=*
  &f=geojson
```

Data is fetched on category toggle and cached in state. Each feature has lat/lng coordinates for map placement.

---

## Civic Action Cards

AI-generated cards in the bottom 40% panel. Each card represents a suggested civic action based on the user's profile and active flow.

### Card Structure
```
┌─────────────────────────────────────────┐
│ 🏥 Health Check-Up                      │
│                                         │
│ You may qualify for free health          │
│ screenings at Montgomery Community       │
│ Health Center (0.8mi away).             │
│                                         │
│ [Show on Map]  [Help me prepare →]      │
└─────────────────────────────────────────┘
```

### Card Fields
- **icon** — Category icon
- **title** — Action name
- **description** — Profile-aware recommendation
- **distance** — From user's zip (mock: 36104)
- **showOnMap** — Zooms map to relevant pin
- **helpMePrepare** — Switches to Chat view with pre-filled context message

### Mock Action Cards (hardcoded for demo, later AI-generated)
1. "Apply for Medicaid" — nearest DHR office
2. "Free Health Screening" — community health center
3. "GED Program Enrollment" — education facility
4. "Job Training at AIDT" — workforce center
5. "Emergency Shelter Info" — nearest tornado shelter
6. "Farmers Market (SNAP accepted)" — food location

---

## Pin Detail (Right Panel)

When a map pin is clicked, the right context panel shows:
- Facility name
- Full address
- Category badge
- Phone number (if available)
- Hours (if available)
- Distance from user zip
- "Help me prepare" button → routes to Chat

When no pin is selected, right panel shows the default (Profile Summary + Action Items).

---

## Component List

| Component | Purpose |
|-----------|---------|
| `ServicesView.tsx` | Main container — map + chips + action cards |
| `ServiceMap.tsx` | Leaflet map with markers and popups |
| `CategoryFilters.tsx` | Toggle chip row for category layers |
| `CivicActionCards.tsx` | Scrollable action card list |
| `CivicActionCard.tsx` | Single action card with map/chat buttons |
| `PinDetailCard.tsx` | Right panel detail for selected pin |
| `arcgisService.ts` | Fetch + cache ArcGIS GeoJSON data |

---

## Integration with Command Center

- `AppView` type gains `"services"` option: `"chat" | "cv" | "services"`
- `FlowSidebar` gains third nav item: Services (with Layers icon)
- `CommandCenter` renders `ServicesView` when `view === "services"`
- Right panel adapts: shows `PinDetailCard` when a pin is selected in services view
- Mobile: "Services" tab in `MobileNav` switches to services view instead of showing the current MobileServicesTab
- State additions: `selectedPin`, `activeCategories`, `servicePoints` (cached GeoJSON features)

---

## State Additions

```typescript
interface ServicePoint {
  id: string;
  category: ServiceCategory;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string;
  details?: Record<string, string>;
}

type ServiceCategory = "health" | "education" | "pharmacy" | "parks" | "safety" | "shelters" | "food_safety" | "poi" | "parking";

// New AppState fields:
selectedPin: ServicePoint | null;
activeCategories: ServiceCategory[];
servicePoints: ServicePoint[];
```

---

## Interaction Flows

1. **Toggle category chip** → fetch ArcGIS data if not cached → add/remove markers on map
2. **Click map pin** → set `selectedPin` → right panel shows PinDetailCard
3. **Click "Show on Map" on action card** → zoom map to pin, select it
4. **Click "Help me prepare"** → switch to Chat view, send context message like "I want to apply for Medicaid at [location]"
5. **Click outside pin** → clear `selectedPin` → right panel returns to default
