import { prisma } from "@/lib/db"

/**
 * Defensive membership adapter.
 * Your repo may represent membership as:
 * - teamMember (teamId, personId)
 * - teamMembership (teamId, personId)
 * - personTeam (teamId, personId)
 * - membership (teamId, personId)
 *
 * We try multiple candidates and return a normalized list.
 */
export async function getTeamMemberships(orgId: string): Promise<Array<{ teamId: string; personId: string }>> {
  // Get team memberships from OrgPosition (teamId + userId)
  try {
    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId: orgId, teamId: { not: null }, userId: { not: null }, isActive: true } as any,
      select: { teamId: true, userId: true } as any,
      take: 50000,
    } as any)
    return (positions || []).map((p: any) => ({ teamId: String(p.teamId), personId: String(p.userId) }))
  } catch {
    return []
  }
}

