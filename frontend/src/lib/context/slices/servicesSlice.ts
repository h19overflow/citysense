import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyServicesAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_SELECTED_PIN":
      return { ...state, selectedPin: action.pin };
    case "TOGGLE_CATEGORY": {
      const cats = state.activeCategories;
      const has = cats.includes(action.category);
      return {
        ...state,
        activeCategories: has
          ? cats.filter((c) => c !== action.category)
          : [...cats, action.category],
      };
    }
    case "SET_SERVICE_POINTS":
      return { ...state, servicePoints: action.points };
    case "ADD_SERVICE_POINTS":
      return {
        ...state,
        servicePoints: [
          ...state.servicePoints.filter(
            (p) => !action.points.some((np) => np.id === p.id)
          ),
          ...action.points,
        ],
      };
    case "ADD_GUIDE_MESSAGE":
      return { ...state, guideMessages: [...state.guideMessages, action.message] };
    case "SET_GUIDE_TYPING":
      return { ...state, guideTyping: action.typing };
    case "SET_MAP_COMMAND":
      return { ...state, mapCommand: action.command };
    case "CLEAR_MAP_COMMAND":
      return { ...state, mapCommand: null };
    case "SEND_GUIDE_MESSAGE":
      return { ...state, guidePendingMessage: action.message };
    case "CLEAR_GUIDE_PENDING":
      return { ...state, guidePendingMessage: null };
    default:
      return null;
  }
}
