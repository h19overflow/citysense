export interface JobFilterState {
  sortBy: "recent" | "match" | "salary";
  jobTypes: Set<string>;
  seniority: Set<string>;
  industry: string;
  titleKeyword: string;
  skill: string;
}

export const JOB_TYPES = ["Full-time", "Part-time", "Contract"];
export const SENIORITY_LEVELS = ["Entry level", "Mid-Senior level", "Director"];

export function createDefaultFilters(): JobFilterState {
  return {
    sortBy: "recent",
    jobTypes: new Set<string>(),
    seniority: new Set<string>(),
    industry: "",
    titleKeyword: "",
    skill: "",
  };
}

export function countActiveFilters(filters: JobFilterState): number {
  let count = 0;
  if (filters.jobTypes.size > 0) count++;
  if (filters.seniority.size > 0) count++;
  if (filters.industry) count++;
  if (filters.titleKeyword) count++;
  if (filters.skill) count++;
  return count;
}
