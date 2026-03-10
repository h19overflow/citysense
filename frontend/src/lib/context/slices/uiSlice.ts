import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyUiAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, activeView: action.view };
    default:
      return null;
  }
}
