import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyCvAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_CV_DATA":
      return { ...state, cvData: action.data, cvAnalyzing: false };
    case "SET_CV_FILE":
      return { ...state, cvFileName: action.fileName };
    case "SET_CV_ANALYZING":
      return { ...state, cvAnalyzing: action.analyzing };
    case "CLEAR_CV":
      return { ...state, cvData: null, cvFileName: null, cvAnalyzing: false };
    default:
      return null;
  }
}
