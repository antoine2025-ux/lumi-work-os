import { prisma } from "@/lib/db"
import type { OrgSnapshotV1 } from "@/server/org/contracts/org-snapshot-v1"
import { computeMinimalOrgHealth } from "@/server/org/health/compute-minimal"

// Local result types for Prisma select queries
type PositionRow = {
  teamId: string | null
  userId: string | null
  title: string | null
  user: { id: string; name: string | null; email: string | null } | null
}

type TeamRow = { id: string; name: string; leaderId: string | null }
type OwnerRow = { entityType: string; entityId: string; ownerPersonId: string }
type AvailabilityRow = { personId: string; status: string; reason: string | null; updatedAt: Date; createdAt: Date }
type RoleRow = { personId: string; role: string; percent: number }
type SkillRow = { personId: string; skill: { name: string } }
type TaxonomyRow = { label: string }
type CapacityRow = { personId: string; fte: number; shrinkagePct: number }
type DomainRow = { id: string; name: string }
type SystemRow = { id: string; name: string }
type TeamMemberRow = { teamId: string; personId: string }
type ManagerLinkRow = { personId: string; managerId: string }

type AvailabilityStatus = "AVAILABLE" | "LIMITED" | "UNAVAILABLE"

export async function buildOrgSnapshotV1(orgId: string): Promise<OrgSnapshotV1> {
  // Get people from OrgPosition with User join
  const positions: PositionRow[] = await prisma.orgPosition.findMany({
    where: { workspaceId: orgId, userId: { not: null }, isActive: true },
    select: {
      teamId: true,
      userId: true,
      title: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    take: 10000, // Hard cap
  }).catch(() => [] as PositionRow[])

  // Fetch health signals (used later in snapshot)
  const health = await computeMinimalOrgHealth(orgId).catch(() => ({ trustScore: 0, signals: [] as { key: string; severity: "INFO" | "WARNING" | "HIGH"; count?: number }[] }))

  const [orgRow, teams, owners, availability, roles, skills, taxRoles, taxSkills, capacityRows, domains, systems] = await Promise.all([
    prisma.org.findFirst({ where: { id: orgId }, select: { id: true, name: true } }).catch(() => null),
    prisma.orgTeam.findMany({ where: { workspaceId: orgId }, select: { id: true, name: true, leaderId: true }, take: 2000 }).catch(() => [] as TeamRow[]),
    (async (): Promise<OwnerRow[]> => {
      try {
        const ownerModel = prisma.ownerAssignment
        if (ownerModel && typeof ownerModel.findMany === "function") {
          return await ownerModel.findMany({
            where: { workspaceId: orgId, isPrimary: true },
            select: { entityType: true, entityId: true, ownerPersonId: true },
            take: 200000,
          }).catch((error: unknown) => {
            if (error instanceof Error && (
              (error as Error & { code?: string }).code === "P2021" ||
              error.message?.includes("does not exist")
            )) {
              return [] as OwnerRow[]
            }
            return [] as OwnerRow[]
          })
        }
        return [] as OwnerRow[]
      } catch {
        return [] as OwnerRow[]
      }
    })(),
    prisma.personAvailabilityHealth.findMany({
      where: { workspaceId: orgId },
      select: { personId: true, status: true, reason: true, updatedAt: true, createdAt: true },
      take: 50000,
    }).catch(() => [] as AvailabilityRow[]),
    prisma.personRoleAssignment.findMany({
      where: { orgId },
      select: { personId: true, role: true, percent: true },
      take: 200000,
    }).catch(() => [] as RoleRow[]),
    prisma.personSkill.findMany({
      where: { workspaceId: orgId },
      select: { personId: true, skill: { select: { name: true } } },
      take: 200000,
    }).catch(() => [] as SkillRow[]),
    prisma.orgRoleTaxonomy.findMany({ where: { orgId }, select: { label: true }, take: 5000 }).catch(() => [] as TaxonomyRow[]),
    prisma.orgSkillTaxonomy.findMany({ where: { orgId }, select: { label: true }, take: 5000 }).catch(() => [] as TaxonomyRow[]),
    // Capacity data (FTE, shrinkage)
    prisma.personCapacity
      .findMany({
        where: { orgId },
        select: { personId: true, fte: true, shrinkagePct: true },
        take: 50000,
      })
      .catch(() => [] as CapacityRow[]),
    // Domains
    prisma.domain
      .findMany({ where: { orgId }, select: { id: true, name: true }, take: 2000 })
      .catch(() => [] as DomainRow[]),
    // Systems
    prisma.systemEntity
      .findMany({ where: { orgId }, select: { id: true, name: true }, take: 2000 })
      .catch(() => [] as SystemRow[]),
  ])

  // Get team memberships from OrgPosition (teamId + userId)
  const teamMembers: TeamMemberRow[] = await prisma.orgPosition
    .findMany({
      where: { workspaceId: orgId, teamId: { not: null }, userId: { not: null }, isActive: true },
      select: { teamId: true, userId: true },
      take: 200000
    })
    .then((rows) => rows.map((p) => ({ teamId: p.teamId!, personId: p.userId! })))
    .catch(() => [] as TeamMemberRow[])

  const managerLinks: ManagerLinkRow[] = await prisma.personManagerLink
    .findMany({ where: { workspaceId: orgId }, select: { personId: true, managerId: true }, take: 200000 })
    .catch(() => [] as ManagerLinkRow[])

  const availabilityBy = new Map<string, AvailabilityRow>()
  for (const a of availability) availabilityBy.set(String(a.personId), a)

  const rolesBy = new Map<string, Array<{ role: string; percent: number }>>()
  for (const r of roles) {
    const pid = String(r.personId)
    const arr = rolesBy.get(pid) ?? []
    arr.push({ role: String(r.role ?? ""), percent: Number(r.percent ?? 100) })
    rolesBy.set(pid, arr)
  }
  for (const [, arr] of rolesBy) {
    arr.sort((x, y) => (y.percent ?? 0) - (x.percent ?? 0))
  }

  const skillsBy = new Map<string, string[]>()
  for (const s of skills) {
    const pid = String(s.personId)
    const arr = skillsBy.get(pid) ?? []
    const v = s.skill?.name ?? ""
    if (v) arr.push(v)
    skillsBy.set(pid, arr)
  }

  const teamIdsByPerson = new Map<string, string[]>()
  const memberIdsByTeam = new Map<string, string[]>()
  for (const tm of teamMembers) {
    const tid = String(tm.teamId)
    const pid = String(tm.personId)
    teamIdsByPerson.set(pid, Array.from(new Set([...(teamIdsByPerson.get(pid) ?? []), tid])))
    memberIdsByTeam.set(tid, Array.from(new Set([...(memberIdsByTeam.get(tid) ?? []), pid])))
  }

  const managerIdsByPerson = new Map<string, string[]>()
  for (const ml of managerLinks) {
    const pid = String(ml.personId)
    const mid = String(ml.managerId)
    managerIdsByPerson.set(pid, Array.from(new Set([...(managerIdsByPerson.get(pid) ?? []), mid])))
  }

  // Build capacity map
  const capacityByPerson = new Map<string, { fte?: number; shrinkagePct?: number }>()
  for (const c of capacityRows || []) {
    const pid = String(c.personId)
    capacityByPerson.set(pid, {
      fte: c.fte ? Number(c.fte) : undefined,
      shrinkagePct: c.shrinkagePct ? Number(c.shrinkagePct) : undefined,
    })
  }

  // Hard caps to protect performance - intentional and versioned
  // Snapshot is for reasoning, not analytics. Anything larger requires batching or v2.
  const teamsCapped = (teams || []).slice(0, 2000)
  const ownersCapped = (owners || []).slice(0, 10000)
  const domainsCapped = (domains || []).slice(0, 2000)
  const systemsCapped = (systems || []).slice(0, 2000)

  // Map positions to people format
  const people = positions.map((pos) => {
    const user = pos.user
    if (!user) return null
    const pid = String(user.id)
    const a = availabilityBy.get(pid)
    const dt = (a?.updatedAt ?? a?.createdAt ?? null) ? new Date(a?.updatedAt ?? a?.createdAt ?? 0).toISOString() : null

    // Get team IDs from position and merge with teamMember table
    const positionTeamIds = pos.teamId ? [String(pos.teamId)] : []
    const memberTeamIds = teamIdsByPerson.get(pid) ?? []
    const teamIds = Array.from(new Set([...positionTeamIds, ...memberTeamIds]))

    const capacity = capacityByPerson.get(pid)

    return {
      id: pid,
      name: String(user.name ?? ""),
      email: user.email ? String(user.email) : null,
      title: pos.title ? String(pos.title) : null,
      availability: {
        status: String(a?.status ?? "AVAILABLE") as AvailabilityStatus,
        reason: a?.reason ? String(a.reason) : null,
        updatedAt: dt,
      },
      roles: rolesBy.get(pid) ?? [],
      skills: skillsBy.get(pid) ?? [],
      teamIds,
      managerIds: managerIdsByPerson.get(pid) ?? [],
      capacity: capacity ? { fte: capacity.fte, shrinkagePct: capacity.shrinkagePct } : undefined,
    }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    org: {
      id: String(orgRow?.id ?? orgId),
      name: orgRow?.name ? String(orgRow.name) : null,
    },
    people: people.slice(0, 10000), // Hard cap: max 10,000 people
    teams: teamsCapped.map((t) => ({
      id: String(t.id),
      name: String(t.name ?? "Team"),
      leadPersonId: t.leaderId ? String(t.leaderId) : null,
      memberIds: memberIdsByTeam.get(String(t.id)) ?? [],
    })),
    domains: domainsCapped.length > 0 ? domainsCapped.map((d) => ({
      id: String(d.id),
      name: String(d.name ?? "Domain"),
    })) : undefined,
    systems: systemsCapped.length > 0 ? systemsCapped.map((s) => ({
      id: String(s.id),
      name: String(s.name ?? "System"),
    })) : undefined,
    ownership: ownersCapped.map((o) => ({
      entityType: String(o.entityType) as OrgSnapshotV1["ownership"][number]["entityType"],
      entityId: String(o.entityId),
      primaryOwnerPersonId: String(o.ownerPersonId),
    })),
    taxonomy: {
      roles: (taxRoles || []).map((r) => String(r.label ?? "")).filter(Boolean),
      skills: (taxSkills || []).map((s) => String(s.label ?? "")).filter(Boolean),
    },
    health: {
      trustScore: health.trustScore,
      signals: health.signals.map((s) => ({
        key: s.key,
        severity: s.severity,
        count: s.count,
      })),
    },
  }
}
