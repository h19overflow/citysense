/**
 * Loads live job data from the scraper pipeline output.
 * In dev: served from public/data/jobs.geojson
 * In prod: fetched from API endpoint backed by job_scraper_service.py
 */
import type { JobListing, JobSkills } from "./types";

export interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    title: string;
    company: string;
    source: string;
    address: string;
    geocode_source: string;
    geocode_address: string;
    job_type: string;
    salary: string;
    seniority: string;
    industry: string;
    applicants: number | null;
    posted: string;
    url: string;
    apply_link: string;
    skills: Record<string, string[]>;
    skill_summary: string;
    benefits: string[];
    scraped_at: string;
  };
}

interface GeoJsonCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export function parseFeatureToJob(feature: GeoJsonFeature): JobListing {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;

  return {
    id: p.id,
    title: p.title,
    company: p.company,
    source: p.source,
    address: p.address,
    lat,
    lng,
    geocodeSource: p.geocode_source,
    jobType: p.job_type,
    salary: p.salary,
    seniority: p.seniority,
    industry: p.industry,
    applicants: p.applicants ?? undefined,
    posted: p.posted,
    url: p.url,
    applyLink: p.apply_link,
    skills: p.skills as JobSkills,
    skillSummary: p.skill_summary,
    benefits: p.benefits ?? [],
    scrapedAt: p.scraped_at,
  };
}

export async function fetchJobListings(): Promise<JobListing[]> {
  const response = await fetch("/data/jobs.geojson");
  if (!response.ok) {
    console.error("Failed to fetch jobs:", response.status);
    return [];
  }

  const geojson: GeoJsonCollection = await response.json();
  return geojson.features.map(parseFeatureToJob);
}
