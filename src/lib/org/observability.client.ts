/**
 * Lightweight client-side observability utilities for Org Center.
 * Provides error logging for critical UI failures.
 * 
 * "use client" - Safe to call from client components.
 */

"use client";

/**
 * Log an Org Center client-side error.
 * 
 * @param event - The error event name
 * @param meta - Additional metadata about the error
 */
export function logOrgClientError(
  event: string,
  meta?: Record<string, unknown>
) {
  // Skip logging in test environment
  if (process.env.NODE_ENV === "test") return;

  // For now, use console; later, this can send to Sentry or a logging endpoint
  console.error(
    JSON.stringify({
      scope: "org_center",
      level: "error",
      event,
      meta,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Log an Org Center client-side warning.
 * 
 * @param event - The warning event name
 * @param meta - Additional metadata
 */
export function logOrgClientWarning(
  event: string,
  meta?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "test") return;

  console.warn(
    JSON.stringify({
      scope: "org_center",
      level: "warn",
      event,
      meta,
      timestamp: new Date().toISOString(),
    })
  );
}

