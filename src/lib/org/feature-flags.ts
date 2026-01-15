/**
 * Org-specific feature flag helpers
 * 
 * These flags control access to Org features that may be incomplete
 * or depend on tables/models that don't exist in all environments.
 * 
 * All flags default to false for safe merge into Loopwell 2.0.
 */

import { isFeatureEnabledByKey } from "@/lib/feature-flags"
import type { WorkspaceId } from "./types"

/**
 * Check if Org Center is force-disabled via environment variable.
 * This is the highest priority check - if true, Org Center is completely disabled.
 */
export function isOrgCenterForceDisabled(): boolean {
  return process.env.ORG_CENTER_FORCE_DISABLED === "true"
}

/**
 * Check if Org Center is enabled via environment variable.
 * This is the main enable/disable switch for Org Center.
 */
export function isOrgCenterEnabled(): boolean {
  // If force disabled, return false regardless of other settings
  if (isOrgCenterForceDisabled()) {
    return false
  }
  // Check environment variable (defaults to enabled if not set for backward compatibility)
  return process.env.NEXT_PUBLIC_ORG_CENTER_ENABLED !== "false"
}

/**
 * Check if Org Center is in beta mode (shows beta badge).
 */
export function isOrgCenterBeta(): boolean {
  return process.env.NEXT_PUBLIC_ORG_CENTER_BETA === "true"
}

/**
 * Check if Org module is enabled (workspace-specific feature flag)
 */
export async function isOrgEnabled(workspaceId: WorkspaceId): Promise<boolean> {
  return await isFeatureEnabledByKey(workspaceId, "org_enabled")
}

/**
 * Check if Org capacity features are enabled
 */
export async function isOrgCapacityEnabled(workspaceId: WorkspaceId): Promise<boolean> {
  return await isFeatureEnabledByKey(workspaceId, "org_capacity_enabled")
}

/**
 * Check if Org management load features are enabled
 */
export async function isOrgManagementLoadEnabled(workspaceId: WorkspaceId): Promise<boolean> {
  return await isFeatureEnabledByKey(workspaceId, "org_management_load_enabled")
}

/**
 * Check if Org ownership features are enabled
 */
export async function isOrgOwnershipEnabled(workspaceId: WorkspaceId): Promise<boolean> {
  return await isFeatureEnabledByKey(workspaceId, "org_ownership_enabled")
}