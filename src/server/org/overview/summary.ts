import { prisma } from "@/lib/db"
import { computeMinimalOrgHealth } from "@/server/org/health/compute-minimal"
import { getOrgCompleteness } from "@/server/org/completeness/check"
import type { OrgId, WorkspaceId } from "@/lib/org/types"

/**
 * Get Org Overview Summary
 * 
 * IMPORTANT: In this codebase, orgId === workspaceId. The orgId parameter
 * is accepted for API ergonomics, but internally all queries use workspaceId.
 * 
 * @param orgId - The organization ID (which equals workspaceId in this codebase)
 * @returns Overview summary with stats, health, and completeness
 */
export async function getOrgOverviewSummary(orgId: OrgId) {
  try {
    // CRITICAL: orgId == workspaceId in this codebase
    // All Prisma queries use workspaceId field
    const workspaceId: WorkspaceId = orgId
    
    const [peopleCountResult, teamCountResult, healthResult, completenessResult] = await Promise.allSettled([
      prisma.orgPosition.count({ where: { workspaceId, userId: { not: null }, isActive: true } as any }).catch(() => 0),
      prisma.orgTeam.count({ where: { workspaceId, isActive: true } as any }).catch(() => 0),
      computeMinimalOrgHealth(orgId).catch((error) => {
        console.error("[getOrgOverviewSummary] Error computing health:", error);
        return { trustScore: 0, signals: [] };
      }),
      getOrgCompleteness(orgId).catch((error) => {
        console.error("[getOrgOverviewSummary] Error getting completeness:", error);
        return [];
      }),
    ])

    const peopleCount = peopleCountResult.status === "fulfilled" ? peopleCountResult.value : 0
    const teamCount = teamCountResult.status === "fulfilled" ? teamCountResult.value : 0
    const health = healthResult.status === "fulfilled" ? healthResult.value : { trustScore: 0, signals: [] }
    const completeness = completenessResult.status === "fulfilled" ? completenessResult.value : []

    const topSignals = (health.signals || [])
      .slice()
      .sort((a, b) => {
        const w = (s: any) => (s.severity === "HIGH" ? 3 : s.severity === "WARNING" ? 2 : 1)
        return w(b) - w(a)
      })
      .slice(0, 2)

    return {
      peopleCount,
      teamCount,
      trustScore: health.trustScore || 0,
      topSignals,
      completeness,
    }
  } catch (error: any) {
    console.error("[getOrgOverviewSummary] Unexpected error:", error);
    // Return safe defaults
    return {
      peopleCount: 0,
      teamCount: 0,
      trustScore: 0,
      topSignals: [],
      completeness: [],
    }
  }
}

