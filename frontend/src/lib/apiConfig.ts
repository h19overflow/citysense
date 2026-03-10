const DEFAULT_BACKEND_URL = "http://localhost:8082";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const API_BASE = trimTrailingSlash(
  import.meta.env.VITE_API_BASE ?? DEFAULT_BACKEND_URL,
);

export const ANALYSIS_API_BASE = trimTrailingSlash(
  import.meta.env.VITE_ANALYSIS_API_BASE ?? API_BASE,
);
