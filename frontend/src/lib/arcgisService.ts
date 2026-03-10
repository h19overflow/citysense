import type { ServiceCategory, ServicePoint } from "./types";

const BASE_URL = "https://gis.montgomeryal.gov/server/rest/services";

interface LayerConfig {
  path: string;
  nameField: string;
  addressField: string;
  phoneField?: string;
  hoursField?: string;
  websiteField?: string;
}

const LAYER_CONFIG: Record<ServiceCategory, LayerConfig> = {
  health: {
    path: "HostedDatasets/Health_Care_Facility/FeatureServer/0",
    nameField: "COMPANY_NA",
    addressField: "ADDRESS",
    phoneField: "PHONE",
  },
  community: {
    path: "HostedDatasets/Community_Centers/FeatureServer/0",
    nameField: "FACILITY_N",
    addressField: "ADDRESS",
  },
  childcare: {
    path: "HostedDatasets/Daycare_Centers/FeatureServer/0",
    nameField: "Name",
    addressField: "Address",
    phoneField: "Phone",
    hoursField: "Day_Hours",
  },
  education: {
    path: "HostedDatasets/Education_Facilities/FeatureServer/0",
    nameField: "NAME",
    addressField: "Address",
    phoneField: "TELEPHONE",
  },
  safety: {
    path: "HostedDatasets/Fire_Stations/FeatureServer/0",
    nameField: "Name",
    addressField: "Address",
  },
  libraries: {
    path: "HostedDatasets/Libraries/FeatureServer/0",
    nameField: "BRANCH_NAME",
    addressField: "ADDRESS",
  },
  parks: {
    path: "Streets_and_POI/FeatureServer/7",
    nameField: "FACILITYID",
    addressField: "FULLADDR",
    hoursField: "OPERHOURS",
  },
  police: {
    path: "HostedDatasets/Police_Facilities/FeatureServer/0",
    nameField: "Facility_Name",
    addressField: "Facility_Address",
  },
};

function computePolygonCentroid(ring: number[][]): [number, number] | null {
  if (ring.length === 0) return null;
  const totalLng = ring.reduce((sum, coord) => sum + coord[0], 0);
  const totalLat = ring.reduce((sum, coord) => sum + coord[1], 0);
  return [totalLat / ring.length, totalLng / ring.length];
}

function extractPointCoordinates(
  geometry: GeoJSON.Geometry | null
): [number, number] | null {
  if (!geometry) return null;

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as [number, number];
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lat, lng];
  }

  if (geometry.type === "Polygon") {
    const firstRing = geometry.coordinates[0] as number[][];
    return computePolygonCentroid(firstRing);
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

  const url =
    `${BASE_URL}/${config.path}/query?` +
    `where=1%3D1&outFields=*&outSR=4326&f=geojson`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let data: { features?: GeoJSON.Feature[] } = {};
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return [];
    data = await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("ArcGIS request timed out:", url);
      return [];
    }
    throw error;
  }
  if (!data.features) return [];

  const points: ServicePoint[] = data.features
    .map((feature: GeoJSON.Feature, index: number) => {
      const props = feature.properties ?? {};
      const coords = extractPointCoordinates(feature.geometry);
      if (!coords) return null;

      const skipKeys = new Set([
        config.nameField, config.addressField,
        "OBJECTID", "OBJECTID_1", "GlobalID",
        "created_user", "created_date", "last_edited_user", "last_edited_date",
        "Status", "Score", "Match_addr", "ARC_Street", "ARC_KeyFie", "Reference",
      ]);
      const details: Record<string, string> = {};
      for (const [key, val] of Object.entries(props)) {
        if (skipKeys.has(key) || val == null || String(val).trim() === "") continue;
        if (key === config.phoneField || key === config.hoursField || key === config.websiteField) continue;
        details[key] = String(val);
      }

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
        details,
      };
    })
    .filter(Boolean) as ServicePoint[];

  cache.set(category, points);
  return points;
}

export function clearServiceCache(): void {
  cache.clear();
}
