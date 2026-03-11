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

const SESSION_KEY = "citysense_session";

interface PersistedSession {
  citizenMeta: AppState["citizenMeta"];
  cvResult: AppState["cvResult"];
  cvFileName: AppState["cvFileName"];
}

function loadPersistedSession(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const session: PersistedSession = JSON.parse(raw);
    return {
      citizenMeta: session.citizenMeta ?? null,
      cvResult: session.cvResult ?? null,
      cvFileName: session.cvFileName ?? null,
    };
  } catch {
    return {};
  }
}

function saveSession(state: AppState): void {
  try {
    const session: PersistedSession = {
      citizenMeta: state.citizenMeta,
      cvResult: state.cvResult,
      cvFileName: state.cvFileName,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable — fail silently
  }
}

function persistingReducer(state: AppState, action: AppAction): AppState {
  const next = appReducer(state, action);
  // Save synchronously after every action that touches persisted fields.
  // Synchronous write ensures data is saved even if the tab closes immediately.
  if (
    next.citizenMeta !== state.citizenMeta ||
    next.cvResult !== state.cvResult ||
    next.cvFileName !== state.cvFileName
  ) {
    saveSession(next);
  }
  return next;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(persistingReducer, {
    ...initialState,
    ...loadPersistedSession(),
  });

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
