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
export async function getTeamMemberships(workspaceId: string): Promise<Array<{ teamId: string; personId: string }>> {
  // Get team memberships from OrgPosition (teamId + userId)
  try {
    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId, teamId: { not: null }, userId: { not: null }, isActive: true },
      select: { teamId: true, userId: true },
      take: 50000,
    })
    return (positions || [])
      .filter((p): p is { teamId: string; userId: string } => p.teamId != null && p.userId != null)
      .map((p) => ({ teamId: p.teamId, personId: p.userId }))
  } catch {
    return []
  }
}

