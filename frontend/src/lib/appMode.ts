/**
 * Demo mode flag — when true, uses mock data and skips real API calls.
 * Set via VITE_DEMO_MODE env var; defaults to true for local dev.
 */
export const IS_DEMO_MODE =
  (import.meta.env.VITE_DEMO_MODE as string | undefined) !== "false";
