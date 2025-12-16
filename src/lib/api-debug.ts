export type ApiDebugEvent = {
  id: string;
  url: string;
  method: string;
  status?: number;
  durationMs?: number;
  ok?: boolean;
  errorMessage?: string;
  label?: string; // optional trace label from useApiAction
  timestamp: number;
  source: "useApiAction" | "apiFetch" | "ApiClient";
};

const DEV_EVENT_NAME = "loopwell:api-debug";

/**
 * Emit a dev-only API debug event on window.
 * Has no effect on the server or in production builds.
 */
export function emitApiDebugEvent(event: ApiDebugEvent) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  const customEvent = new CustomEvent<ApiDebugEvent>(DEV_EVENT_NAME, {
    detail: event,
  });

  window.dispatchEvent(customEvent);
}

/**
 * Name of the window event used by the overlay.
 * Mostly for internal reuse.
 */
export const API_DEBUG_EVENT_NAME = DEV_EVENT_NAME;

