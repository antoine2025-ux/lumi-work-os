import { computeOrgGuidance } from "./orgGuidance";
import { measureOrgHealth } from "./orgHealth";

export async function buildWeeklyDigest(workspaceId: string) {
  const health = await measureOrgHealth(workspaceId);
  const guidance = await computeOrgGuidance(workspaceId);

  return {
    score: Math.round(health.score * 100),
    breakdown: health.breakdown,
    topActions: guidance,
    generatedAt: new Date().toISOString(),
  };
}

