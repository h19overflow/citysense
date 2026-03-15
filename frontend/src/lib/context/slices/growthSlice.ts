import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyGrowthAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_GROWTH_STAGE":
      return { ...state, growthStage: action.stage };
    case "SET_GROWTH_ANALYSIS":
      return { ...state, growthAnalysis: action.analysis };
    case "SET_GROWTH_INTAKE_ID":
      return { ...state, growthIntakeId: action.intakeId };
    case "SET_GROWTH_PROGRESS":
      return { ...state, growthProgress: action.progress };
    case "TOGGLE_GROWTH_DIFF":
      return { ...state, growthDiffVisible: !state.growthDiffVisible };
    case "CLEAR_GROWTH":
      return {
        ...state,
        growthStage: "idle",
        growthAnalysis: null,
        growthIntakeId: null,
        growthProgress: null,
        growthDiffVisible: false,
        activeRoadmapPath: null,
        activeRoadmapAnalysisId: null,
        activeRoadmapPathKey: null,
      };
    case "SET_ACTIVE_ROADMAP_PATH":
      return {
        ...state,
        activeRoadmapPath: action.path,
        activeRoadmapAnalysisId: action.analysisId,
        activeRoadmapPathKey: action.pathKey,
      };
    case "CLEAR_ACTIVE_ROADMAP_PATH":
      return {
        ...state,
        activeRoadmapPath: null,
        activeRoadmapAnalysisId: null,
        activeRoadmapPathKey: null,
      };
    default:
      return null;
  }
}
