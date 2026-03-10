/**
 * Commute estimation: calculates approximate travel times from
 * citizen location to job/service locations using haversine distance
 * and Montgomery transit route matching.
 */
import type { CommuteEstimate, JobMatch, TransitRoute } from "./types";

const MONTGOMERY_CENTER = { lat: 32.3668, lng: -86.3000 };
const AVG_DRIVING_MPH = 25; // city average with traffic
const AVG_TRANSIT_MPH = 12; // bus with stops
const AVG_WALKING_MPH = 3;
const MAX_WALKING_MILES = 3;

function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function estimateCommutes(
  jobs: JobMatch[],
  userLat: number,
  userLng: number,
  transitRoutes: TransitRoute[],
): CommuteEstimate[] {
  return jobs
    .filter((job) => job.lat && job.lng)
    .map((job) => {
      const distance = haversineDistanceMiles(userLat, userLng, job.lat, job.lng);
      const drivingMinutes = Math.round((distance / AVG_DRIVING_MPH) * 60);

      // Check if any transit routes might serve this area
      const nearbyRoutes = transitRoutes.map((r) => r.name);
      const hasTransit = transitRoutes.length > 0 && distance < 15;
      const transitMinutes = hasTransit
        ? Math.round((distance / AVG_TRANSIT_MPH) * 60) + 10 // +10 min wait
        : null;

      const walkingMinutes = distance <= MAX_WALKING_MILES
        ? Math.round((distance / AVG_WALKING_MPH) * 60)
        : null;

      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        distanceMiles: Math.round(distance * 10) / 10,
        drivingMinutes,
        transitMinutes,
        transitRoutes: hasTransit ? nearbyRoutes.slice(0, 2) : [],
        walkingMinutes,
      };
    })
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export function getDefaultUserLocation(): { lat: number; lng: number } {
  return MONTGOMERY_CENTER;
}
