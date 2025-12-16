/**
 * Lightweight observability utilities for Org Center.
 * Provides structured logging and timing for loaders and API routes.
 * 
 * All logs are structured as JSON for easy filtering and analysis.
 * Safe to call from server-only code.
 */

export type OrgLogLevel = "debug" | "info" | "warn" | "error";

type OrgLogPayload = {
  scope: "org_center";
  level: OrgLogLevel;
  event: string;
  route?: string;
  loader?: string;
  orgId?: string | null;
  userId?: string | null;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

/**
 * Log an Org Center event with structured JSON output.
 * 
 * @param payload - The log payload with event details
 */
export function logOrgEvent(payload: OrgLogPayload) {
  const { level, ...rest } = payload;

  // Skip logging in test environment
  if (process.env.NODE_ENV === "test") return;

  // Map log level to console method
  const method =
    level === "error"
      ? console.error
      : level === "warn"
      ? console.warn
      : level === "info"
      ? console.info
      : console.debug;

  // Output structured JSON for easy filtering
  method(JSON.stringify(rest));
}

/**
 * Time an Org Center loader and log its duration.
 * Also logs errors if the loader fails.
 * 
 * @param loaderName - Name of the loader being timed
 * @param orgId - Organization ID (can be null)
 * @param userId - User ID (can be null)
 * @param fn - The async function to time
 * @returns The result of the function
 */
export async function timeOrgLoader<T>(
  loaderName: string,
  orgId: string | null,
  userId: string | null,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;

    logOrgEvent({
      scope: "org_center",
      level: "info",
      event: "loader_timing",
      loader: loaderName,
      orgId,
      userId,
      durationMs: duration,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - start;

    logOrgEvent({
      scope: "org_center",
      level: "error",
      event: "loader_error",
      loader: loaderName,
      orgId,
      userId,
      durationMs: duration,
      meta: {
        message: error?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
    });

    throw error;
  }
}

/**
 * Log an API route event (start, success, or error).
 * 
 * @param event - Event type: "api_start", "api_success", "api_error", "api_unauthorized"
 * @param route - The API route path
 * @param orgId - Organization ID (can be null)
 * @param userId - User ID (can be null)
 * @param durationMs - Duration in milliseconds (for success/error events)
 * @param meta - Additional metadata
 */
export function logOrgApiEvent(
  event: "api_start" | "api_success" | "api_error" | "api_unauthorized",
  route: string,
  orgId: string | null = null,
  userId: string | null = null,
  durationMs?: number,
  meta?: Record<string, unknown>
) {
  const level =
    event === "api_error"
      ? "error"
      : event === "api_unauthorized"
      ? "warn"
      : "info";

  logOrgEvent({
    scope: "org_center",
    level,
    event,
    route,
    orgId,
    userId,
    durationMs,
    meta,
  });
}

