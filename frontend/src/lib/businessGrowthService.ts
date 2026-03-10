export interface PermitByMonth {
  month: string;
  count: number;
}

export interface PermitByType {
  type: string;
  count: number;
}

export interface BusinessGrowthData {
  generatedAt: string;
  newPermits30d: number;
  commercialPercent: number;
  newBusinesses90d: number;
  topPermitType: string;
  permitsByMonth: PermitByMonth[];
  permitsByType: PermitByType[];
}

let cached: BusinessGrowthData | null = null;

export async function fetchBusinessGrowthData(): Promise<BusinessGrowthData | null> {
  if (cached) return cached;

  try {
    const response = await fetch("/data/business_growth.json");
    if (!response.ok) return null;
    cached = await response.json();
    return cached;
  } catch {
    return null;
  }
}

export function computeCommercialPercent(data: BusinessGrowthData): string {
  return `${data.commercialPercent}%`;
}

export function computeTopPermitType(data: BusinessGrowthData): string {
  return data.topPermitType || "N/A";
}

export function extractTopCategories(data: BusinessGrowthData): PermitByType[] {
  return data.permitsByType.slice(0, 6);
}
