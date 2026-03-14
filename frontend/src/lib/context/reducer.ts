import type { AppState } from "../types";
import type { AppAction } from "./types";
import { applyChatAction } from "./slices/chatSlice";
import { applyCvAction } from "./slices/cvSlice";
import { applyJobsAction } from "./slices/jobsSlice";
import { applyNewsAction } from "./slices/newsSlice";
import { applyRoadmapAction } from "./slices/roadmapSlice";
import { applyServicesAction } from "./slices/servicesSlice";
import { applyUiAction } from "./slices/uiSlice";
import { applyGrowthAction } from "./slices/growthSlice";

const slices = [
  applyChatAction,
  applyCvAction,
  applyJobsAction,
  applyNewsAction,
  applyRoadmapAction,
  applyServicesAction,
  applyUiAction,
  applyGrowthAction,
];

export function appReducer(state: AppState, action: AppAction): AppState {
  for (const applySlice of slices) {
    const result = applySlice(state, action);
    if (result !== null) return result;
  }
  return state;
}
