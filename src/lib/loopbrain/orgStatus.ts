/**
 * Org Loopbrain Status
 * 
 * Helper to inspect Org Loopbrain configuration and status.
 * Useful for debugging and admin interfaces.
 */

import { LOOPBRAIN_ORG_CONFIG } from "./config";
import { isFeatureEnabledByKey } from "@/lib/feature-flags";

export type OrgLoopbrainStatus = {
  enabledGlobally: boolean;
  featureEnabled: boolean;
  effectiveEnabled: boolean;
  model: string;
  maxTokens: number;
  timeoutMs: number;
};

/**
 * Get Org Loopbrain status for a workspace
 * 
 * Returns configuration and effective enabled state.
 */
export async function getOrgLoopbrainStatus(
  workspaceId: string
): Promise<OrgLoopbrainStatus> {
  const featureEnabled = await isFeatureEnabledByKey(workspaceId, "org_loopbrain");

  return {
    enabledGlobally: LOOPBRAIN_ORG_CONFIG.enabledGlobally,
    featureEnabled,
    effectiveEnabled:
      LOOPBRAIN_ORG_CONFIG.enabledGlobally && featureEnabled,
    model: LOOPBRAIN_ORG_CONFIG.model,
    maxTokens: LOOPBRAIN_ORG_CONFIG.maxTokens,
    timeoutMs: LOOPBRAIN_ORG_CONFIG.timeoutMs,
  };
}

