import { prisma } from "@/lib/db"
import { cacheOrg } from "@/server/org/cache"

const _getPersonProfile = async (orgId: string, personId: string) => {
  // Get person from OrgPosition (personId is actually userId or positionId)
  // Try as userId first, then as positionId
  const position = await prisma.orgPosition.findFirst({
    where: {
      workspaceId: orgId,
      OR: [
        { userId: personId },
        { id: personId },
      ],
      isActive: true,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  }).catch(() => null)

  if (!position || !position.user) return null

  const person = {
    id: position.user.id,
    name: position.user.name ?? "",
    email: position.user.email ?? null,
    title: position.title ?? null,
  }

  const userId = person.id

  // Best-effort relations (keep resilient if some models are absent).
  // Note field naming conventions:
  //   - PersonAvailabilityHealth, PersonSkill, PersonManagerLink: use workspaceId
  //   - PersonRoleAssignment: uses orgId (legacy, not yet migrated)
  const [availability, roles, skills, managers, teams] = await Promise.all([
    prisma.personAvailabilityHealth
      .findFirst({
        where: { workspaceId: orgId, personId: userId },
        select: { status: true, reason: true, updatedAt: true, createdAt: true },
      })
      .catch(() => null),
    prisma.personRoleAssignment
      .findMany({
        where: { orgId, personId: userId },
        select: { role: true, percent: true },
        orderBy: { percent: "desc" },
        take: 20,
      })
      .catch(() => [] as Array<{ role: string; percent: number }>),
    prisma.personSkill
      .findMany({
        where: { workspaceId: orgId, personId: userId },
        select: { skill: { select: { name: true } } },
        take: 100,
      })
      .catch(() => [] as Array<{ skill: { name: string } }>),
    prisma.personManagerLink
      .findMany({
        where: { workspaceId: orgId, personId: userId },
        select: { managerId: true },
        take: 5,
      })
      .catch(() => [] as Array<{ managerId: string }>),
    // Get teams from position's teamId
    (async () => {
      try {
        if (position.teamId) {
          const team = await prisma.orgTeam.findFirst({
            where: { workspaceId: orgId, id: position.teamId },
            select: { id: true, name: true },
          })
          return team ? [{ id: team.id, name: team.name ?? "Team" }] : []
        }
        return []
      } catch {
        return []
      }
    })(),
  ])

  const skillTags = (skills ?? []).map((s) => s.skill.name).filter(Boolean)
  const roleRows = (roles ?? []).map((r) => ({ role: r.role, percent: r.percent }))

  return {
    person: {
      id: person.id,
      name: person.name,
      email: person.email,
      title: person.title,
    },
    org: {
      teams,
      managerIds: (managers ?? []).map((m) => m.managerId),
    },
    availability: availability
      ? {
          status: String(availability.status),
          reason: availability.reason ?? null,
          updatedAt: availability.updatedAt ?? availability.createdAt ?? null,
        }
      : {
          status: "AVAILABLE",
          reason: null,
          updatedAt: null,
        },
    roles: roleRows,
    skills: skillTags,
  }
}

export const getPersonProfile = cacheOrg(
  ["org:personProfile"],
  _getPersonProfile,
  { revalidate: 30, tags: ["org:people"] }
)
