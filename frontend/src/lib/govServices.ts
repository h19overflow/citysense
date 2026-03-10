/**
 * Government services data loader.
 * Loads curated service guides from gov_services.json with eligibility,
 * how-to-apply steps, required documents, and direct links.
 */

import { API_BASE } from "./apiConfig";

export interface ServiceGuide {
  id: string;
  category: string;
  title: string;
  provider: string;
  description: string;
  eligibility: string[];
  howToApply: string[];
  documentsNeeded: string[];
  incomeLimits: string[];
  url: string;
  phone: string;
  address: string;
  tags: string[];
  scrapedAt: string;
}

interface RawServiceGuide {
  id: string;
  category: string;
  title: string;
  provider: string;
  description: string;
  eligibility: string[];
  how_to_apply: string[];
  documents_needed: string[];
  income_limits: string[];
  url: string;
  phone: string;
  address: string;
  tags: string[];
  scraped_at: string;
}

interface GovServicesData {
  services: RawServiceGuide[];
}

function parseRawGuide(raw: RawServiceGuide): ServiceGuide {
  return {
    id: raw.id,
    category: raw.category,
    title: raw.title,
    provider: raw.provider,
    description: raw.description,
    eligibility: raw.eligibility,
    howToApply: raw.how_to_apply,
    documentsNeeded: raw.documents_needed,
    incomeLimits: raw.income_limits ?? [],
    url: raw.url,
    phone: raw.phone,
    address: raw.address,
    tags: raw.tags,
    scrapedAt: raw.scraped_at,
  };
}

let cachedGuides: ServiceGuide[] | null = null;

export async function fetchServiceGuides(): Promise<ServiceGuide[]> {
  if (cachedGuides) return cachedGuides;

  const response = await fetch(`${API_BASE}/api/benefits`);
  if (!response.ok) {
    console.error("Failed to fetch gov_services.json:", response.status);
    return [];
  }

  const data: GovServicesData = await response.json();
  cachedGuides = data.services.map(parseRawGuide);
  return cachedGuides;
}

export function filterGuidesByCategory(guides: ServiceGuide[], category: string): ServiceGuide[] {
  return guides.filter((g) => g.category === category);
}

export function searchGuides(guides: ServiceGuide[], query: string): ServiceGuide[] {
  const q = query.toLowerCase();
  return guides.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.provider.toLowerCase().includes(q) ||
      g.tags.some((t) => t.includes(q)),
  );
}
