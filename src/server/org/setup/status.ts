import { prisma } from "@/lib/db"
import { cacheOrg } from "@/server/org/cache"

const _getOrgSetupStatus = async (orgId: string) => {
  // Minimal completeness gates (v0). Tune later.
  const [peopleCount, teamCount, ownerCount, peopleWithRoles, peopleWithTeams] = await Promise.all([
    prisma.orgPosition.count({ where: { workspaceId: orgId, userId: { not: null }, isActive: true } as any }).catch(() => 0),
    prisma.orgTeam.count({ where: { workspaceId: orgId } as any }).catch(() => 0),
    (async () => {
      try {
        if (prisma.ownerAssignment && typeof (prisma.ownerAssignment as any).count === "function") {
          return await (prisma.ownerAssignment as any).count({ where: { orgId, isPrimary: true } as any }).catch((error: any) => {
            // Handle missing table (P2021)
            if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
              return 0
            }
            return 0
          })
        }
        return 0
      } catch {
        return 0
      }
    })(),
    // Count people with non-empty titles
    prisma.orgPosition.count({
      where: {
        workspaceId: orgId,
        userId: { not: null },
        isActive: true,
        title: { not: null },
      } as any,
    }).catch(() => 0),
    // Count people with teams assigned
    prisma.orgPosition.count({
      where: {
        workspaceId: orgId,
        userId: { not: null },
        isActive: true,
        teamId: { not: null },
      } as any,
    }).catch(() => 0),
  ])

  const setupIncomplete = peopleCount === 0 || teamCount === 0
  const rolesComplete = peopleCount > 0 && peopleWithRoles === peopleCount
  const teamsComplete = peopleCount > 0 && peopleWithTeams === peopleCount

  return {
    setupIncomplete,
    peopleCount,
    teamCount,
    ownerCount,
    peopleWithRoles,
    peopleWithTeams,
    rolesComplete,
    teamsComplete,
  }
}

export const getOrgSetupStatus = cacheOrg(
  ["org:setupStatus"],
  _getOrgSetupStatus,
  { revalidate: 30, tags: ["org:setup"] }
)

