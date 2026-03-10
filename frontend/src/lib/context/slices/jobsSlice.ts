import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyJobsAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_JOB_LISTINGS":
      return { ...state, jobListings: action.listings };
    case "SET_JOB_MATCHES":
      return { ...state, jobMatches: action.matches };
    case "SET_TRENDING_SKILLS":
      return { ...state, trendingSkills: action.skills };
    case "SET_JOBS_LOADING":
      return { ...state, jobsLoading: action.loading };
    case "SET_UPSKILLING_SUMMARY":
      return { ...state, upskillingSummary: action.summary };
    case "SET_TRANSIT_ROUTES":
      return { ...state, transitRoutes: action.routes };
    case "SET_COMMUTE_ESTIMATES":
      return { ...state, commuteEstimates: action.estimates };
    case "SET_CITIZEN_META":
      return { ...state, citizenMeta: action.meta };
    case "MERGE_JOB_LISTINGS": {
      const existingIds = new Set(state.jobListings.map((j) => j.id));
      const fresh = action.listings.filter((j) => !existingIds.has(j.id));
      return { ...state, jobListings: [...fresh, ...state.jobListings] };
    }
    case "MERGE_HOUSING_LISTINGS": {
      const existingIds = new Set(state.housingListings.map((h) => h.id));
      const fresh = action.listings.filter((h) => !existingIds.has(h.id));
      return { ...state, housingListings: [...fresh, ...state.housingListings] };
    }
    default:
      return null;
  }
}
