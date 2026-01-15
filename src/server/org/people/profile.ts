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
    } as any,
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

  // Best-effort relations (keep resilient if some models are absent)
  const [availability, roles, skills, managers, teams] = await Promise.all([
    prisma.personAvailabilityHealth
      .findFirst({
        where: { orgId, personId: userId } as any,
        select: { status: true, reason: true, updatedAt: true, createdAt: true } as any,
      })
      .catch(() => null),
    prisma.personRoleAssignment
      .findMany({
        where: { orgId, personId: userId } as any,
        select: { role: true, percent: true } as any,
        orderBy: { percent: "desc" } as any,
        take: 20,
      })
      .catch(() => [] as any[]),
    prisma.personSkill
      .findMany({
        where: { orgId, personId: userId } as any,
        select: { skill: true } as any,
        take: 100,
      })
      .catch(() => [] as any[]),
    prisma.personManagerLink
      .findMany({
        where: { orgId, personId: userId } as any,
        select: { managerId: true } as any,
        take: 5,
      })
      .catch(() => [] as any[]),
    // Get teams from position's teamId
    (async () => {
      try {
        if (position.teamId) {
          const team = await prisma.orgTeam.findFirst({
            where: { workspaceId: orgId, id: position.teamId } as any,
            select: { id: true, name: true } as any,
          })
          return team ? [{ id: String(team.id), name: String(team.name ?? "Team") }] : []
        }
        return []
      } catch {
        return []
      }
    })(),
  ])

  const skillTags = (skills || []).map((s: any) => String(s.skill ?? "")).filter(Boolean)
  const roleRows = (roles || []).map((r: any) => ({ role: String(r.role ?? ""), percent: Number(r.percent ?? 100) }))

  return {
    person: {
      id: String(person.id),
      name: String(person.name ?? ""),
      email: person.email ? String(person.email) : null,
      title: person.title ? String(person.title) : null,
    },
    org: {
      teams,
      managerIds: (managers || []).map((m: any) => String(m.managerId)),
    },
    availability: availability
      ? {
          status: String((availability as any).status ?? "AVAILABLE"),
          reason: (availability as any).reason ? String((availability as any).reason) : null,
          updatedAt: (availability as any).updatedAt ?? (availability as any).createdAt ?? null,
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

