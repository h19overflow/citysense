import type { ServicePoint } from "@/lib/types";
import type { SortOption } from "./ServiceDetailView";

export function computeDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const deltaLat = toRad(toLat - fromLat);
  const deltaLng = toRad(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterAndSortPoints(
  points: ServicePoint[],
  query: string,
  sortOption: SortOption,
  userLocation: [number, number] | null,
): ServicePoint[] {
  const lowercaseQuery = query.toLowerCase();
  const filtered = query
    ? points.filter(
        (p) =>
          p.name.toLowerCase().includes(lowercaseQuery) ||
          p.address.toLowerCase().includes(lowercaseQuery),
      )
    : points;

  if (sortOption === "nearest" && userLocation) {
    return [...filtered].sort(
      (a, b) =>
        computeDistanceKm(userLocation[0], userLocation[1], a.lat, a.lng) -
        computeDistanceKm(userLocation[0], userLocation[1], b.lat, b.lng),
    );
  }

  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
}
