import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyRoadmapAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_ACTIVE_ROADMAP":
      return { ...state, activeRoadmap: action.roadmap, roadmapCompletedStepIds: [] };
    case "CLEAR_ROADMAP":
      return { ...state, activeRoadmap: null, roadmapCompletedStepIds: [] };
    case "TOGGLE_ROADMAP_STEP": {
      const wasCompleted = state.roadmapCompletedStepIds.includes(action.stepId);
      return {
        ...state,
        roadmapCompletedStepIds: wasCompleted
          ? state.roadmapCompletedStepIds.filter((id) => id !== action.stepId)
          : [...state.roadmapCompletedStepIds, action.stepId],
      };
    }
    default:
      return null;
  }
}
