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
  const candidates: Array<() => Promise<Array<{ teamId: string; personId: string }>>> = [
    // Try OrgPosition (teamId + userId)
    async () => {
      const positions = await prisma.orgPosition?.findMany?.({
        where: { workspaceId: orgId, teamId: { not: null }, userId: { not: null }, isActive: true } as any,
        select: { teamId: true, userId: true } as any,
        take: 50000,
      } as any)
      return (positions || []).map((p: any) => ({ teamId: String(p.teamId), personId: String(p.userId) }))
    },
    async () =>
      (await prisma.teamMember?.findMany?.({
        where: { orgId } as any,
        select: { teamId: true, personId: true } as any,
        take: 50000,
      } as any)) as any,
    async () =>
      (await prisma.teamMembership?.findMany?.({
        where: { orgId } as any,
        select: { teamId: true, personId: true } as any,
        take: 50000,
      } as any)) as any,
    async () =>
      (await prisma.personTeam?.findMany?.({
        where: { orgId } as any,
        select: { teamId: true, personId: true } as any,
        take: 50000,
      } as any)) as any,
    async () =>
      (await prisma.membership?.findMany?.({
        where: { orgId } as any,
        select: { teamId: true, personId: true } as any,
        take: 50000,
      } as any)) as any,
  ]

  for (const fn of candidates) {
    try {
      const rows = await fn()
      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.teamId && rows[0]?.personId) {
        return rows.map((r) => ({ teamId: String(r.teamId), personId: String(r.personId) }))
      }
    } catch {
      // try next candidate
    }
  }

  return []
}

