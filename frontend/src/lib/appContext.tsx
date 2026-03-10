import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { AppState } from "./types";
import type { AppAction } from "./context/types";
import { appReducer } from "./context/reducer";
import { initialState } from "./context/initialState";

// Re-export AppAction so existing imports from this file continue to work.
export type { AppAction };

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
