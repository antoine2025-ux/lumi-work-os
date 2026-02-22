import { computeOrgGuidance } from "./orgGuidance";
import { measureOrgHealth } from "./orgHealth";

export async function buildWeeklyDigest(orgId: string) {
  const health = await measureOrgHealth(orgId);
  const guidance = await computeOrgGuidance(orgId);

  return {
    score: Math.round(health.score * 100),
    breakdown: health.breakdown,
    topActions: guidance,
    generatedAt: new Date().toISOString(),
  };
}

