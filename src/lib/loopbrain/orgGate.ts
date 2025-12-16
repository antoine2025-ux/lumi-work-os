/**
 * Org Loopbrain Gate
 * 
 * Centralized check for whether Org Loopbrain is enabled.
 * Combines global config and workspace-specific feature flag.
 */

import { LOOPBRAIN_ORG_CONFIG } from "./config";
import { isFeatureEnabledByKey } from "@/lib/feature-flags";

/**
 * Check if Org Loopbrain is enabled for a workspace
 * 
 * Returns true only if:
 * 1. Global config allows it (LOOPBRAIN_ORG_ENABLED=true or non-production)
 * 2. Workspace feature flag "org_loopbrain" is enabled
 */
export async function isOrgLoopbrainEnabled(workspaceId: string): Promise<boolean> {
  if (!workspaceId) return false;

  // First check global config
  if (!LOOPBRAIN_ORG_CONFIG.enabledGlobally) {
    return false;
  }

  // Then check workspace-specific feature flag
  const flag = await isFeatureEnabledByKey(workspaceId, "org_loopbrain");
  return flag;
}

