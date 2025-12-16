/**
 * Feature flags for Org Center.
 * These can be controlled via environment variables without code changes.
 */

export function isOrgCenterEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ORG_CENTER_ENABLED !== "false";
}

export function isOrgCenterBeta(): boolean {
  return process.env.NEXT_PUBLIC_ORG_CENTER_BETA === "true";
}

/**
 * Emergency force-disable flag (server-side only).
 * When set to "true", Org Center is completely disabled globally.
 * This allows instant disabling without code changes.
 */
export function isOrgCenterForceDisabled(): boolean {
  return process.env.ORG_CENTER_FORCE_DISABLED === "true";
}

