# Services Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive "Services" tab to the Command Center with a real Leaflet map pulling live data from Montgomery's ArcGIS REST APIs, category filters, and civic action cards.

**Architecture:** The Services view is a new `AppView` option rendered inside `CommandCenter.tsx`. It uses `react-leaflet` for the map, fetches real GeoJSON from `gis.montgomeryal.gov`, and stores service points + UI state in the existing `AppProvider` reducer. The right `ContextPanel` adapts to show pin details when a service point is selected.

**Tech Stack:** React 18, TypeScript, react-leaflet + leaflet, Tailwind CSS, existing shadcn/ui components, Montgomery ArcGIS REST API (no auth required)

**Design Doc:** `docs/plans/2026-03-05-services-tab-design.md`

---

## Real ArcGIS Endpoints (Verified Working)

| Category | Endpoint | Geometry | Key Fields |
|----------|----------|----------|------------|
| Health | `Health_Care_Facility/MapServer/0` | Point | COMPANY_NA, ADDRESS, PHONE, TYPE_FACIL, BEDS_UNITS |
| Parks | `Streets_and_POI/FeatureServer/7` | Polygon (need centroid) | FACILITYID (name), FULLADDR, OPERDAYS, OPERHOURS, PARKURL |
| Universities | `Streets_and_POI/FeatureServer/11` | Polygon (need centroid) | Name |
| Entertainment | `OneView/Entertainment_Districts/FeatureServer/0` | Polygon | Ordinance |
| Buildings | `OneView/Buildings_And_Addressess/FeatureServer/0` | Point | address fields |
| Flood Zones | `OneView/Flood_Hazard_Areas/FeatureServer/0` | Polygon | zone info |

**Base URL:** `https://gis.montgomeryal.gov/server/rest/services`
**Query pattern:** `/{service}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`

**Note:** Parks and Universities return polygons. We compute centroids client-side for map markers.

---

## Task 1: Install react-leaflet and add Leaflet CSS

**Files:**
- Modify: `montgomery-navigator/package.json` (via npm install)
- Modify: `montgomery-navigator/src/main.tsx` (add Leaflet CSS import)

**Step 1: Install dependencies**

Run:
```bash
cd montgomery-navigator && npm install leaflet react-leaflet && npm install -D @types/leaflet
```
Expected: packages added to package.json

**Step 2: Import Leaflet CSS in main.tsx**

Add to `src/main.tsx` after other imports:
```tsx
import "leaflet/dist/leaflet.css";
```

**Step 3: Verify the app still builds**

Run:
```bash
cd montgomery-navigator && npm run build
```
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add montgomery-navigator/package.json montgomery-navigator/package-lock.json montgomery-navigator/src/main.tsx
git commit -m "chore: install react-leaflet and leaflet CSS"
```

---

## Task 2: Extend types and AppProvider for services state

**Files:**
- Modify: `montgomery-navigator/src/lib/types.ts:1-98`
- Modify: `montgomery-navigator/src/lib/appContext.tsx:1-119`

**Step 1: Add service types to `types.ts`**

Add after the `CvData` interface (line 82):

```typescript
export type ServiceCategory =
  | "health"
  | "parks"
  | "education"
  | "entertainment"
  | "safety"
  | "government";

export interface ServicePoint {
  id: string;
  category: ServiceCategory;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string;
  website?: string;
  details?: Record<string, string>;
}

export interface CivicAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: ServiceCategory;
  relatedPinId?: string;
  distance?: string;
}
```

**Step 2: Extend `AppView` to include `"services"`**

Change line 3 of `types.ts`:
```typescript
export type AppView = "chat" | "cv" | "services";
```

**Step 3: Extend `AppState` with new fields**

Add to `AppState` interface (after `cvAnalyzing: boolean`):
```typescript
selectedPin: ServicePoint | null;
activeCategories: ServiceCategory[];
servicePoints: ServicePoint[];
```

**Step 4: Add reducer actions to `appContext.tsx`**

Add these action types:
```typescript
| { type: "SET_SELECTED_PIN"; pin: ServicePoint | null }
| { type: "TOGGLE_CATEGORY"; category: ServiceCategory }
| { type: "SET_SERVICE_POINTS"; points: ServicePoint[] }
| { type: "ADD_SERVICE_POINTS"; points: ServicePoint[] }
```

Update `initialState`:
```typescript
selectedPin: null,
activeCategories: ["health", "parks", "education"] as ServiceCategory[],
servicePoints: [],
```

Add reducer cases:
```typescript
case "SET_SELECTED_PIN":
  return { ...state, selectedPin: action.pin };
case "TOGGLE_CATEGORY": {
  const cats = state.activeCategories;
  const has = cats.includes(action.category);
  return {
    ...state,
    activeCategories: has
      ? cats.filter((c) => c !== action.category)
      : [...cats, action.category],
  };
}
case "SET_SERVICE_POINTS":
  return { ...state, servicePoints: action.points };
case "ADD_SERVICE_POINTS":
  return {
    ...state,
    servicePoints: [
      ...state.servicePoints.filter(
        (p) => !action.points.some((np) => np.id === p.id)
      ),
      ...action.points,
    ],
  };
```

**Step 5: Add the new type imports to `appContext.tsx`**

Add `ServicePoint`, `ServiceCategory` to the import from `./types`.

**Step 6: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 7: Commit**

```bash
git add montgomery-navigator/src/lib/types.ts montgomery-navigator/src/lib/appContext.tsx
git commit -m "feat(state): add services types, categories, and reducer actions"
```

---

## Task 3: ArcGIS data service

**Files:**
- Create: `montgomery-navigator/src/lib/arcgisService.ts`

**Step 1: Create `arcgisService.ts`**

This module fetches GeoJSON from Montgomery's ArcGIS REST API and converts features into `ServicePoint[]`.

```typescript
import type { ServiceCategory, ServicePoint } from "./types";

const BASE_URL = "https://gis.montgomeryal.gov/server/rest/services";

interface LayerConfig {
  path: string;
  nameField: string;
  addressField: string;
  phoneField?: string;
  hoursField?: string;
  websiteField?: string;
  isPolygon?: boolean;
}

const LAYER_CONFIG: Record<ServiceCategory, LayerConfig> = {
  health: {
    path: "Health_Care_Facility/MapServer/0",
    nameField: "COMPANY_NA",
    addressField: "ADDRESS",
    phoneField: "PHONE",
  },
  parks: {
    path: "Streets_and_POI/FeatureServer/7",
    nameField: "FACILITYID",
    addressField: "FULLADDR",
    hoursField: "OPERHOURS",
    websiteField: "PARKURL",
    isPolygon: true,
  },
  education: {
    path: "Streets_and_POI/FeatureServer/11",
    nameField: "Name",
    addressField: "",
    isPolygon: true,
  },
  entertainment: {
    path: "OneView/Entertainment_Districts/FeatureServer/0",
    nameField: "Ordinance",
    addressField: "",
    isPolygon: true,
  },
  safety: {
    path: "OneView/Police_Jurisdiction/MapServer/4",
    nameField: "Name",
    addressField: "",
    isPolygon: true,
  },
  government: {
    path: "OneView/City_Council_District/FeatureServer/0",
    nameField: "Name",
    addressField: "",
    isPolygon: true,
  },
};

function computePolygonCentroid(coords: number[][][]): [number, number] {
  const ring = coords[0];
  let latSum = 0;
  let lngSum = 0;
  for (const [lng, lat] of ring) {
    latSum += lat;
    lngSum += lng;
  }
  return [latSum / ring.length, lngSum / ring.length];
}

function extractCoordinates(
  geometry: GeoJSON.Geometry
): [number, number] | null {
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as [number, number];
    return [lat, lng];
  }
  if (geometry.type === "Polygon") {
    return computePolygonCentroid(
      geometry.coordinates as number[][][]
    );
  }
  if (geometry.type === "MultiPolygon") {
    return computePolygonCentroid(
      (geometry.coordinates as number[][][][])[0]
    );
  }
  return null;
}

const cache = new Map<ServiceCategory, ServicePoint[]>();

export async function fetchServicePoints(
  category: ServiceCategory
): Promise<ServicePoint[]> {
  if (cache.has(category)) return cache.get(category)!;

  const config = LAYER_CONFIG[category];
  if (!config) return [];

  const fields = [
    config.nameField,
    config.addressField,
    config.phoneField,
    config.hoursField,
    config.websiteField,
  ]
    .filter(Boolean)
    .join(",");

  const url =
    `${BASE_URL}/${config.path}/query?` +
    `where=1%3D1&outFields=${fields}&outSR=4326&f=geojson`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  if (!data.features) return [];

  const points: ServicePoint[] = data.features
    .map((feature: GeoJSON.Feature, index: number) => {
      const props = feature.properties ?? {};
      const coords = extractCoordinates(feature.geometry);
      if (!coords) return null;

      return {
        id: `${category}-${index}`,
        category,
        name: props[config.nameField] ?? "Unknown",
        address: props[config.addressField] ?? "",
        lat: coords[0],
        lng: coords[1],
        phone: config.phoneField ? props[config.phoneField] : undefined,
        hours: config.hoursField ? props[config.hoursField] : undefined,
        website: config.websiteField ? props[config.websiteField] : undefined,
      };
    })
    .filter(Boolean) as ServicePoint[];

  cache.set(category, points);
  return points;
}

export function clearServiceCache(): void {
  cache.clear();
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 3: Commit**

```bash
git add montgomery-navigator/src/lib/arcgisService.ts
git commit -m "feat(services): ArcGIS REST data service with caching"
```

---

## Task 4: CategoryFilters component

**Files:**
- Create: `montgomery-navigator/src/components/app/services/CategoryFilters.tsx`

**Step 1: Create `CategoryFilters.tsx`**

```typescript
import {
  Heart,
  Trees,
  GraduationCap,
  Theater,
  Shield,
  Landmark,
} from "lucide-react";
import type { ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";

interface CategoryConfig {
  id: ServiceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "health", label: "Health", icon: Heart, color: "#E74C3C" },
  { id: "parks", label: "Parks", icon: Trees, color: "#2ECC71" },
  { id: "education", label: "Education", icon: GraduationCap, color: "#3498DB" },
  { id: "entertainment", label: "Entertainment", icon: Theater, color: "#9B59B6" },
  { id: "safety", label: "Safety", icon: Shield, color: "#E67E22" },
  { id: "government", label: "Government", icon: Landmark, color: "#1ABC9C" },
];

export function CategoryFilters() {
  const { state, dispatch } = useApp();

  function handleToggle(category: ServiceCategory) {
    dispatch({ type: "TOGGLE_CATEGORY", category });
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
        const active = state.activeCategories.includes(id);
        return (
          <button
            key={id}
            onClick={() => handleToggle(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              active
                ? "text-white shadow-sm"
                : "bg-background text-muted-foreground border-border/60 hover:border-border"
            }`}
            style={
              active
                ? { backgroundColor: color, borderColor: color }
                : undefined
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export { CATEGORIES };
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/services/CategoryFilters.tsx
git commit -m "feat(services): category filter chips component"
```

---

## Task 5: ServiceMap component

**Files:**
- Create: `montgomery-navigator/src/components/app/services/ServiceMap.tsx`

This is the core Leaflet map. It renders markers for visible service points, handles click-to-select, and supports fly-to for "Show on Map" actions.

**Step 1: Create `ServiceMap.tsx`**

```typescript
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ServicePoint, ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  health: "#E74C3C",
  parks: "#2ECC71",
  education: "#3498DB",
  entertainment: "#9B59B6",
  safety: "#E67E22",
  government: "#1ABC9C",
};

function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function MapDataLoader() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    async function loadCategories() {
      for (const category of state.activeCategories) {
        const existing = state.servicePoints.filter(
          (p) => p.category === category
        );
        if (existing.length > 0) continue;

        const points = await fetchServicePoints(category);
        if (points.length > 0) {
          dispatch({ type: "ADD_SERVICE_POINTS", points });
        }
      }
    }
    loadCategories();
  }, [state.activeCategories]);

  return null;
}

function FlyToPin({ pin }: { pin: ServicePoint | null }) {
  const map = useMap();
  const prevPinRef = useRef<string | null>(null);

  useEffect(() => {
    if (pin && pin.id !== prevPinRef.current) {
      map.flyTo([pin.lat, pin.lng], 15, { duration: 0.8 });
      prevPinRef.current = pin.id;
    }
  }, [pin, map]);

  return null;
}

export function ServiceMap() {
  const { state, dispatch } = useApp();

  const visiblePoints = state.servicePoints.filter((p) =>
    state.activeCategories.includes(p.category)
  );

  function handleMarkerClick(point: ServicePoint) {
    dispatch({ type: "SET_SELECTED_PIN", pin: point });
  }

  return (
    <MapContainer
      center={MONTGOMERY_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapDataLoader />
      <FlyToPin pin={state.selectedPin} />
      {visiblePoints.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={createColoredIcon(CATEGORY_COLORS[point.category])}
          eventHandlers={{ click: () => handleMarkerClick(point) }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{point.name}</p>
              {point.address && <p className="text-gray-600">{point.address}</p>}
              {point.phone && <p>{point.phone}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/services/ServiceMap.tsx
git commit -m "feat(services): Leaflet map with real ArcGIS data markers"
```

---

## Task 6: CivicActionCard and CivicActionCards components

**Files:**
- Create: `montgomery-navigator/src/components/app/services/CivicActionCard.tsx`
- Create: `montgomery-navigator/src/components/app/services/CivicActionCards.tsx`
- Create: `montgomery-navigator/src/lib/civicActions.ts`

**Step 1: Create mock civic actions data `civicActions.ts`**

These are hardcoded for now but structured so AI can generate them later.

```typescript
import type { CivicAction } from "./types";

export const CIVIC_ACTIONS: CivicAction[] = [
  {
    id: "ca-1",
    icon: "heart",
    title: "Free Health Screening",
    description:
      "You may qualify for free health screenings at Baptist Medical Center East. Walk-ins accepted Tuesdays and Thursdays.",
    category: "health",
    relatedPinId: "health-0",
    distance: "2.1 mi",
  },
  {
    id: "ca-2",
    icon: "graduation-cap",
    title: "GED Program Enrollment",
    description:
      "Alabama State University offers free GED prep classes. Next cohort starts March 15.",
    category: "education",
    relatedPinId: "education-1",
    distance: "3.4 mi",
  },
  {
    id: "ca-3",
    icon: "trees",
    title: "Community Garden Plot",
    description:
      "Bellinger Hill Park has open garden plots for Montgomery residents. SNAP benefits accepted for seeds and supplies.",
    category: "parks",
    relatedPinId: "parks-1",
    distance: "1.8 mi",
  },
  {
    id: "ca-4",
    icon: "shield",
    title: "Neighborhood Watch Sign-Up",
    description:
      "Join your local neighborhood watch program. Monthly meetings at your district community center.",
    category: "safety",
    distance: "0.5 mi",
  },
  {
    id: "ca-5",
    icon: "landmark",
    title: "City Council Public Comment",
    description:
      "Next city council meeting is March 11. Register to speak on housing and transit issues.",
    category: "government",
    distance: "4.2 mi",
  },
  {
    id: "ca-6",
    icon: "heart",
    title: "Apply for Medicaid",
    description:
      "Based on your household size, you likely qualify for Alabama Medicaid. Nearest DHR office is on S Union St.",
    category: "health",
    distance: "1.2 mi",
  },
];
```

**Step 2: Create `CivicActionCard.tsx`**

```typescript
import {
  Heart,
  Trees,
  GraduationCap,
  Shield,
  Landmark,
  Theater,
  MapPin,
  ArrowRight,
} from "lucide-react";
import type { CivicAction, ServiceCategory } from "@/lib/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  trees: Trees,
  "graduation-cap": GraduationCap,
  shield: Shield,
  landmark: Landmark,
  theater: Theater,
};

const COLOR_MAP: Record<ServiceCategory, string> = {
  health: "text-red-500 bg-red-50",
  parks: "text-green-500 bg-green-50",
  education: "text-blue-500 bg-blue-50",
  entertainment: "text-purple-500 bg-purple-50",
  safety: "text-orange-500 bg-orange-50",
  government: "text-teal-500 bg-teal-50",
};

interface CivicActionCardProps {
  action: CivicAction;
  onShowOnMap: (action: CivicAction) => void;
  onHelpMePrepare: (action: CivicAction) => void;
}

export function CivicActionCard({
  action,
  onShowOnMap,
  onHelpMePrepare,
}: CivicActionCardProps) {
  const Icon = ICON_MAP[action.icon] ?? Heart;
  const colorClass = COLOR_MAP[action.category];

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className={`rounded-md p-1.5 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{action.title}</h4>
            {action.distance && (
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {action.distance}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {action.description}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {action.relatedPinId && (
          <button
            onClick={() => onShowOnMap(action)}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MapPin className="h-3 w-3" />
            Show on Map
          </button>
        )}
        <button
          onClick={() => onHelpMePrepare(action)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Help me prepare
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Create `CivicActionCards.tsx`**

```typescript
import { CivicActionCard } from "./CivicActionCard";
import { CIVIC_ACTIONS } from "@/lib/civicActions";
import type { CivicAction } from "@/lib/types";
import { useApp } from "@/lib/appContext";

interface CivicActionCardsProps {
  onNavigateToChat: (message: string) => void;
}

export function CivicActionCards({ onNavigateToChat }: CivicActionCardsProps) {
  const { state, dispatch } = useApp();

  const visibleActions = CIVIC_ACTIONS.filter((a) =>
    state.activeCategories.includes(a.category)
  );

  function handleShowOnMap(action: CivicAction) {
    if (!action.relatedPinId) return;
    const pin = state.servicePoints.find((p) => p.id === action.relatedPinId);
    if (pin) {
      dispatch({ type: "SET_SELECTED_PIN", pin });
    }
  }

  function handleHelpMePrepare(action: CivicAction) {
    dispatch({ type: "SET_VIEW", view: "chat" });
    onNavigateToChat(`I want to: ${action.title}. ${action.description}`);
  }

  if (visibleActions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select categories above to see civic actions
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 overflow-y-auto">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Civic Actions For You
      </p>
      {visibleActions.map((action) => (
        <CivicActionCard
          key={action.id}
          action={action}
          onShowOnMap={handleShowOnMap}
          onHelpMePrepare={handleHelpMePrepare}
        />
      ))}
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 5: Commit**

```bash
git add montgomery-navigator/src/lib/civicActions.ts montgomery-navigator/src/components/app/services/CivicActionCard.tsx montgomery-navigator/src/components/app/services/CivicActionCards.tsx
git commit -m "feat(services): civic action cards with map and chat integration"
```

---

## Task 7: PinDetailCard component

**Files:**
- Create: `montgomery-navigator/src/components/app/services/PinDetailCard.tsx`

**Step 1: Create `PinDetailCard.tsx`**

This shows in the right ContextPanel when a map pin is selected.

```typescript
import {
  Heart,
  Trees,
  GraduationCap,
  Theater,
  Shield,
  Landmark,
  Phone,
  Clock,
  MapPin,
  ExternalLink,
  X,
} from "lucide-react";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";

const CATEGORY_ICONS: Record<
  ServiceCategory,
  React.ComponentType<{ className?: string }>
> = {
  health: Heart,
  parks: Trees,
  education: GraduationCap,
  entertainment: Theater,
  safety: Shield,
  government: Landmark,
};

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  health: "Health",
  parks: "Parks & Recreation",
  education: "Education",
  entertainment: "Entertainment",
  safety: "Public Safety",
  government: "Government",
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  health: "bg-red-100 text-red-700",
  parks: "bg-green-100 text-green-700",
  education: "bg-blue-100 text-blue-700",
  entertainment: "bg-purple-100 text-purple-700",
  safety: "bg-orange-100 text-orange-700",
  government: "bg-teal-100 text-teal-700",
};

interface PinDetailCardProps {
  pin: ServicePoint;
  onHelpMePrepare: (pin: ServicePoint) => void;
}

export function PinDetailCard({ pin, onHelpMePrepare }: PinDetailCardProps) {
  const { dispatch } = useApp();
  const Icon = CATEGORY_ICONS[pin.category];
  const colorClass = CATEGORY_COLORS[pin.category];

  function handleClose() {
    dispatch({ type: "SET_SELECTED_PIN", pin: null });
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
            {CATEGORY_LABELS[pin.category]}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="text-sm font-semibold">{pin.name}</h3>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        {pin.address && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{pin.address}</span>
          </div>
        )}
        {pin.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{pin.phone}</span>
          </div>
        )}
        {pin.hours && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{pin.hours}</span>
          </div>
        )}
        {pin.website && (
          <a
            href={pin.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>Visit website</span>
          </a>
        )}
      </div>

      <button
        onClick={() => onHelpMePrepare(pin)}
        className="w-full text-xs py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
      >
        Help me prepare
      </button>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/services/PinDetailCard.tsx
git commit -m "feat(services): pin detail card for right panel"
```

---

## Task 8: ServicesView container

**Files:**
- Create: `montgomery-navigator/src/components/app/services/ServicesView.tsx`

**Step 1: Create `ServicesView.tsx`**

This is the main container — category chips on top, map (60%), civic action cards (40%).

```typescript
import { CategoryFilters } from "./CategoryFilters";
import { ServiceMap } from "./ServiceMap";
import { CivicActionCards } from "./CivicActionCards";

interface ServicesViewProps {
  onNavigateToChat: (message: string) => void;
}

export function ServicesView({ onNavigateToChat }: ServicesViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <CategoryFilters />
      <div className="flex-[6] min-h-0 px-4 pb-2">
        <ServiceMap />
      </div>
      <div className="flex-[4] min-h-0 border-t border-border/30 overflow-y-auto">
        <CivicActionCards onNavigateToChat={onNavigateToChat} />
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 3: Commit**

```bash
git add montgomery-navigator/src/components/app/services/ServicesView.tsx
git commit -m "feat(services): ServicesView container with map and action cards"
```

---

## Task 9: Wire into CommandCenter + ContextPanel + FlowSidebar

**Files:**
- Modify: `montgomery-navigator/src/pages/CommandCenter.tsx`
- Modify: `montgomery-navigator/src/components/app/ContextPanel.tsx`
- Modify: `montgomery-navigator/src/components/app/FlowSidebar.tsx`
- Modify: `montgomery-navigator/src/components/app/MobileNav.tsx`

**Step 1: Update `FlowSidebar.tsx` — add Services nav button**

Add `Layers` to the lucide import:
```typescript
import { Layers, MessageSquare, TrendingUp } from "lucide-react";
```

Add a third `ViewNavButton` between Chat and Career Growth (after line 66):
```tsx
<ViewNavButton
  label="Services"
  view="services"
  activeView={state.activeView}
  icon={Layers}
  onSelect={handleViewSelect}
/>
```

**Step 2: Update `ContextPanel.tsx` — show PinDetailCard when pin selected**

Replace the entire file:

```typescript
import ActiveArtifact from "./ActiveArtifact";
import ProfileSummary from "./ProfileSummary";
import ActionItems from "./ActionItems";
import { PinDetailCard } from "./services/PinDetailCard";
import { useApp } from "@/lib/appContext";
import type { ServicePoint } from "@/lib/types";

interface ContextPanelProps {
  onNavigateToChat?: (message: string) => void;
}

export default function ContextPanel({ onNavigateToChat }: ContextPanelProps) {
  const { state, dispatch } = useApp();

  function handleHelpMePrepare(pin: ServicePoint) {
    dispatch({ type: "SET_VIEW", view: "chat" });
    if (onNavigateToChat) {
      onNavigateToChat(
        `I need help with ${pin.name} at ${pin.address || "this location"}`
      );
    }
  }

  const showPinDetail =
    state.activeView === "services" && state.selectedPin !== null;

  return (
    <aside className="w-[380px] flex-shrink-0 border-l border-border bg-background flex flex-col overflow-y-auto">
      {showPinDetail && (
        <>
          <PinDetailCard
            pin={state.selectedPin!}
            onHelpMePrepare={handleHelpMePrepare}
          />
          <hr className="border-border/30 mx-4" />
        </>
      )}
      {!showPinDetail && <ActiveArtifact />}
      {!showPinDetail && <hr className="border-border/30 mx-4" />}
      <ProfileSummary />
      <hr className="border-border/30 mx-4" />
      <ActionItems />
    </aside>
  );
}
```

**Step 3: Update `CommandCenter.tsx` — render ServicesView**

Add import at top:
```typescript
import { ServicesView } from "@/components/app/services/ServicesView";
```

Change the view logic. Replace the `showCvView` / `showChatView` block (lines 162-163):
```typescript
const currentView = state.activeView;
```

In the JSX, replace the conditional rendering inside the center `<div className="flex-1 flex flex-col min-w-0">`:

```tsx
{currentView === "chat" && (
  <>
    {/* Mobile: chat tab content */}
    <div className="lg:hidden flex-1 overflow-hidden flex flex-col">
      {mobileTab === "services" && (
        <ServicesView onNavigateToChat={handleSendMessage} />
      )}
      {mobileTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          <FlowBanner />
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
            {state.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onChipClick={handleSendMessage} />
            ))}
            <ProcessingIndicator />
          </div>
          <ChatInput onSend={handleSendMessage} />
        </div>
      )}
    </div>

    {/* Desktop: always show chat */}
    <div className="hidden lg:flex flex-col flex-1 min-h-0">
      <FlowBanner />
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onChipClick={handleSendMessage} />
        ))}
        <ProcessingIndicator />
      </div>
      <ChatInput onSend={handleSendMessage} />
    </div>
  </>
)}

{currentView === "services" && (
  <ServicesView onNavigateToChat={handleSendMessage} />
)}

{currentView === "cv" && <CvUploadView />}
```

**Step 4: Update `ContextPanel` usage in `CommandCenter.tsx`**

Pass `onNavigateToChat` to ContextPanel:
```tsx
<ContextPanel onNavigateToChat={handleSendMessage} />
```

**Step 5: Update `MobileNav` — handle services tab properly**

In `CommandCenter.tsx`, update `handleMobileTabChange`:
```typescript
function handleMobileTabChange(tab: MobileTab) {
  setMobileTab(tab);
  if (tab === "cv") dispatch({ type: "SET_VIEW", view: "cv" });
  if (tab === "chat") dispatch({ type: "SET_VIEW", view: "chat" });
  if (tab === "services") dispatch({ type: "SET_VIEW", view: "services" });
}
```

**Step 6: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 7: Run dev server and verify visually**

Run: `cd montgomery-navigator && npm run dev`
Expected: App loads, Services tab visible in sidebar, clicking it shows map centered on Montgomery with markers.

**Step 8: Commit**

```bash
git add montgomery-navigator/src/pages/CommandCenter.tsx montgomery-navigator/src/components/app/ContextPanel.tsx montgomery-navigator/src/components/app/FlowSidebar.tsx
git commit -m "feat(services): wire Services tab into CommandCenter, sidebar, and context panel"
```

---

## Task 10: Fix Leaflet default marker icon (known Vite issue)

**Files:**
- Create: `montgomery-navigator/src/lib/leafletSetup.ts`
- Modify: `montgomery-navigator/src/main.tsx`

Leaflet's default marker icons break in Vite due to asset bundling. Our custom DivIcons avoid this, but the fix is still needed for Popup close buttons and any fallback markers.

**Step 1: Create `leafletSetup.ts`**

```typescript
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
```

**Step 2: Import in `main.tsx`**

Add after Leaflet CSS import:
```typescript
import "./lib/leafletSetup";
```

**Step 3: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Succeeds

**Step 4: Commit**

```bash
git add montgomery-navigator/src/lib/leafletSetup.ts montgomery-navigator/src/main.tsx
git commit -m "fix: patch Leaflet default icon URLs for Vite bundler"
```

---

## Summary

| Task | Component | Dependencies |
|------|-----------|-------------|
| 1 | Install react-leaflet | None |
| 2 | Types + AppProvider | None |
| 3 | ArcGIS data service | Task 2 |
| 4 | CategoryFilters | Task 2 |
| 5 | ServiceMap | Tasks 1, 2, 3 |
| 6 | CivicActionCards | Tasks 2, 3 |
| 7 | PinDetailCard | Task 2 |
| 8 | ServicesView | Tasks 4, 5, 6 |
| 9 | Wire into CommandCenter | Tasks 7, 8 |
| 10 | Leaflet icon fix | Task 1 |

**Independent groups for parallel execution:**
- **Batch A** (no deps): Tasks 1, 2
- **Batch B** (after Batch A): Tasks 3, 4, 7, 10
- **Batch C** (after Batch B): Tasks 5, 6
- **Batch D** (after Batch C): Task 8
- **Batch E** (after Batch D): Task 9
