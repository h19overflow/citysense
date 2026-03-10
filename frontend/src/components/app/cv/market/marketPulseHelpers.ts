import type { JobListing } from "@/lib/types";

export function countByField<T extends object>(
  items: T[],
  extractKey: (item: T) => string
): Record<string, number> {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = extractKey(item);
    if (key) accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function computeTopSector(jobs: JobListing[]): { name: string; count: number } {
  const counts = countByField(jobs, (job) => job.industry);
  const [name, count] = Object.entries(counts).sort(([, a], [, b]) => b - a)[0] ?? ["—", 0];
  return { name, count };
}

export function computeEntryLevelPercent(jobs: JobListing[]): number {
  if (jobs.length === 0) return 0;
  const entryCount = jobs.filter((job) => job.seniority === "Entry level").length;
  return Math.round((entryCount / jobs.length) * 100);
}

export function computeAverageApplicants(jobs: JobListing[]): number {
  const jobsWithApplicants = jobs.filter((job) => typeof job.applicants === "number");
  if (jobsWithApplicants.length === 0) return 0;
  const total = jobsWithApplicants.reduce((sum, job) => sum + (job.applicants ?? 0), 0);
  return Math.round(total / jobsWithApplicants.length);
}

export function computeTopSixByCount(
  counts: Record<string, number>
): Array<{ name: string; count: number }> {
  return Object.entries(counts)
    .filter(([name]) => name.trim() !== "")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
}

export function extractTitleKeyword(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("nurse") || lowerTitle.includes("nursing")) return "Nurse";
  if (lowerTitle.includes("associate")) return "Associate";
  if (lowerTitle.includes("manager")) return "Manager";
  if (lowerTitle.includes("technician") || lowerTitle.includes("tech")) return "Technician";
  if (lowerTitle.includes("assistant")) return "Assistant";
  if (lowerTitle.includes("driver")) return "Driver";
  if (lowerTitle.includes("sales")) return "Sales";
  if (lowerTitle.includes("analyst")) return "Analyst";
  if (lowerTitle.includes("engineer")) return "Engineer";
  if (lowerTitle.includes("coordinator")) return "Coordinator";
  return title.split(/\s+/)[0] ?? title;
}
