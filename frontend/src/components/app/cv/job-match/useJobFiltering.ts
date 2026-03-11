import { useEffect, useMemo } from "react";
import { useApp } from "@/lib/appContext";
import { matchJobsToProfile, computeTrendingSkills, jobMatchesSkillFilter } from "@/lib/jobMatcher";
import { fetchJobListings } from "@/lib/jobService";
import { extractTitleKeyword } from "../MarketPulse";
import type { JobMatch } from "@/lib/types";
import type { JobFilterState } from "../JobFilters";

function parseSalaryMinimum(salary: string): number {
  const match = salary.match(/\$?([\d,.]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, ""));
}

function sortJobs(jobs: JobMatch[], sortBy: string): JobMatch[] {
  return [...jobs].sort((a, b) => {
    if (sortBy === "recent") return new Date(b.posted).getTime() - new Date(a.posted).getTime();
    if (sortBy === "match") return b.matchPercent - a.matchPercent;
    if (sortBy === "salary") return parseSalaryMinimum(b.salary) - parseSalaryMinimum(a.salary);
    return 0;
  });
}

function applyFilters(
  jobs: JobMatch[],
  sourceFilter: string,
  searchQuery: string,
  filters: JobFilterState,
): JobMatch[] {
  return jobs.filter((job) => {
    if (sourceFilter !== "All" && job.source.toLowerCase() !== sourceFilter.toLowerCase()) return false;
    if (filters.jobTypes.size > 0 && !filters.jobTypes.has(job.jobType)) return false;
    if (filters.seniority.size > 0 && !filters.seniority.has(job.seniority)) return false;
    if (filters.industry && job.industry !== filters.industry) return false;
    if (filters.titleKeyword && extractTitleKeyword(job.title) !== filters.titleKeyword) return false;
    if (filters.skill && !jobMatchesSkillFilter(job, filters.skill)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.skillSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

interface UseJobFilteringOptions {
  sourceFilter: string;
  searchQuery: string;
  filters: JobFilterState;
  hasCv: boolean;
}

interface UseJobFilteringResult {
  displayJobs: JobMatch[];
  industries: string[];
  matchedCount: number;
}

export function useJobFiltering({
  sourceFilter,
  searchQuery,
  filters,
  hasCv,
}: UseJobFilteringOptions): UseJobFilteringResult {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (state.jobListings.length > 0) return;
    dispatch({ type: "SET_JOBS_LOADING", loading: true });
    fetchJobListings().then((listings) => {
      dispatch({ type: "SET_JOB_LISTINGS", listings });
      dispatch({ type: "SET_TRENDING_SKILLS", skills: computeTrendingSkills(listings) });
      dispatch({ type: "SET_JOBS_LOADING", loading: false });
    });
  }, []);

  useEffect(() => {
    if (!state.cvResult || state.jobListings.length === 0) {
      dispatch({ type: "SET_JOB_MATCHES", matches: [] });
      return;
    }
    dispatch({ type: "SET_JOB_MATCHES", matches: matchJobsToProfile(state.jobListings, state.cvResult) });
  }, [state.cvResult, state.jobListings]);

  const industries = useMemo(() => {
    const set = new Set(state.jobListings.map((j) => j.industry).filter(Boolean));
    return [...set].sort();
  }, [state.jobListings]);

  const displayJobs = useMemo(() => {
    const base: JobMatch[] = hasCv
      ? state.jobMatches
      : state.jobListings.map((j) => ({
          ...j,
          matchPercent: 0,
          matchedSkills: [] as string[],
          missingSkills: [] as string[],
        }));
    const filtered = applyFilters(base, sourceFilter, searchQuery, filters);
    return sortJobs(filtered, filters.sortBy);
  }, [hasCv, state.jobMatches, state.jobListings, sourceFilter, searchQuery, filters]);

  const matchedCount = state.jobMatches.filter((m) => m.matchPercent >= 40).length;

  return { displayJobs, industries, matchedCount };
}
