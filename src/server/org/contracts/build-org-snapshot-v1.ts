import { prisma } from "@/lib/db"
import type { OrgSnapshotV1 } from "@/server/org/contracts/org-snapshot-v1"
import { computeMinimalOrgHealth } from "@/server/org/health/compute-minimal"

export async function buildOrgSnapshotV1(orgId: string): Promise<OrgSnapshotV1> {
  // Get people from OrgPosition with User join
  const positions = await prisma.orgPosition.findMany({
    where: { workspaceId: orgId, userId: { not: null }, isActive: true } as any,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    take: 10000, // Hard cap
  }).catch(() => [] as any[])

  // Fetch health signals (used later in snapshot)
  const health = await computeMinimalOrgHealth(orgId).catch(() => ({ trustScore: 0, signals: [] }))

  const [orgRow, teams, owners, availability, roles, skills, taxRoles, taxSkills, capacityRows, domains, systems] = await Promise.all([
    prisma.org.findFirst({ where: { id: orgId } as any, select: { id: true, name: true } as any }).catch(() => null),
    prisma.orgTeam.findMany({ where: { workspaceId: orgId } as any, select: { id: true, name: true, leadPersonId: true } as any, take: 2000 }).catch(() => [] as any[]),
    (async () => {
      try {
        if (prisma.ownerAssignment && typeof (prisma.ownerAssignment as any).findMany === "function") {
          return await (prisma.ownerAssignment as any).findMany({
            where: { orgId, isPrimary: true } as any,
            select: { entityType: true, entityId: true, personId: true } as any,
            take: 200000,
          } as any).catch((error: any) => {
            if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
              return [] as any[]
            }
            return [] as any[]
          })
        }
        return [] as any[]
      } catch {
        return [] as any[]
      }
    })(),
    prisma.personAvailabilityHealth.findMany({
      where: { orgId } as any,
      select: { personId: true, status: true, reason: true, updatedAt: true, createdAt: true } as any,
      take: 50000,
    }).catch(() => [] as any[]),
    prisma.personRoleAssignment.findMany({
      where: { orgId } as any,
      select: { personId: true, role: true, percent: true } as any,
      take: 200000,
    }).catch(() => [] as any[]),
    prisma.personSkill.findMany({
      where: { orgId } as any,
      select: { personId: true, skill: true } as any,
      take: 200000,
    }).catch(() => [] as any[]),
    prisma.orgRoleTaxonomy.findMany({ where: { orgId } as any, select: { label: true } as any, take: 5000 }).catch(() => [] as any[]),
    prisma.orgSkillTaxonomy.findMany({ where: { orgId } as any, select: { label: true } as any, take: 5000 }).catch(() => [] as any[]),
    // Capacity data (FTE, shrinkage, allocation)
    prisma.personCapacity
      .findMany({
        where: { orgId } as any,
        select: { personId: true, fte: true, shrinkagePct: true, allocationPct: true } as any,
        take: 50000,
      })
      .catch(() => [] as any[]),
    // Domains
    prisma.domain
      .findMany({ where: { orgId } as any, select: { id: true, name: true } as any, take: 2000 })
      .catch(() => [] as any[]),
    // Systems
    prisma.systemEntity
      .findMany({ where: { orgId } as any, select: { id: true, name: true } as any, take: 2000 })
      .catch(() => [] as any[]),
  ])

  const teamMembers = await (async () => {
    try {
      if ((prisma as any).teamMember && typeof (prisma as any).teamMember.findMany === "function") {
        return await (prisma as any).teamMember.findMany({
          where: { orgId } as any,
          select: { teamId: true, personId: true } as any,
          take: 200000,
        }).catch(() => [] as any[])
      }
      return [] as any[]
    } catch {
      return [] as any[]
    }
  })()

  const managerLinks = await (async () => {
    try {
      if ((prisma as any).personManagerLink && typeof (prisma as any).personManagerLink.findMany === "function") {
        return await (prisma as any).personManagerLink.findMany({
          where: { orgId } as any,
          select: { personId: true, managerId: true } as any,
          take: 200000,
        }).catch(() => [] as any[])
      }
      return [] as any[]
    } catch {
      return [] as any[]
    }
  })()

  const availabilityBy = new Map<string, any>()
  for (const a of availability) availabilityBy.set(String((a as any).personId), a)

  const rolesBy = new Map<string, Array<{ role: string; percent: number }>>()
  for (const r of roles) {
    const pid = String((r as any).personId)
    const arr = rolesBy.get(pid) ?? []
    arr.push({ role: String((r as any).role ?? ""), percent: Number((r as any).percent ?? 100) })
    rolesBy.set(pid, arr)
  }
  for (const [k, arr] of rolesBy) {
    arr.sort((x, y) => (y.percent ?? 0) - (x.percent ?? 0))
    rolesBy.set(k, arr.slice(0, 10))
  }

  const skillsBy = new Map<string, string[]>()
  for (const s of skills) {
    const pid = String((s as any).personId)
    const arr = skillsBy.get(pid) ?? []
    const v = String((s as any).skill ?? "")
    if (v) arr.push(v)
    skillsBy.set(pid, arr)
  }

  const teamIdsByPerson = new Map<string, string[]>()
  const memberIdsByTeam = new Map<string, string[]>()
  for (const tm of teamMembers) {
    const tid = String((tm as any).teamId)
    const pid = String((tm as any).personId)
    teamIdsByPerson.set(pid, Array.from(new Set([...(teamIdsByPerson.get(pid) ?? []), tid])))
    memberIdsByTeam.set(tid, Array.from(new Set([...(memberIdsByTeam.get(tid) ?? []), pid])))
  }

  const managerIdsByPerson = new Map<string, string[]>()
  for (const ml of managerLinks) {
    const pid = String((ml as any).personId)
    const mid = String((ml as any).managerId)
    managerIdsByPerson.set(pid, Array.from(new Set([...(managerIdsByPerson.get(pid) ?? []), mid])))
  }

  // Build capacity map
  const capacityByPerson = new Map<string, { fte?: number; shrinkagePct?: number; allocationPct?: number }>()
  for (const c of capacityRows || []) {
    const pid = String((c as any).personId)
    capacityByPerson.set(pid, {
      fte: (c as any).fte ? Number((c as any).fte) : undefined,
      shrinkagePct: (c as any).shrinkagePct ? Number((c as any).shrinkagePct) : undefined,
      allocationPct: (c as any).allocationPct ? Number((c as any).allocationPct) : undefined,
    })
  }

  // Hard caps to protect performance - intentional and versioned
  // Snapshot is for reasoning, not analytics. Anything larger requires batching or v2.
  const teamsCapped = (teams || []).slice(0, 2000)
  const ownersCapped = (owners || []).slice(0, 10000)
  const domainsCapped = (domains || []).slice(0, 2000)
  const systemsCapped = (systems || []).slice(0, 2000)

  // Map positions to people format
  const people = positions.map((pos: any) => {
    const user = pos.user
    if (!user) return null
    const pid = String(user.id)
    const a = availabilityBy.get(pid)
    const dt = (a?.updatedAt ?? a?.createdAt ?? null) ? new Date(a?.updatedAt ?? a?.createdAt).toISOString() : null
    
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
        status: String(a?.status ?? "AVAILABLE") as any,
        reason: a?.reason ? String(a.reason) : null,
        updatedAt: dt,
      },
      roles: rolesBy.get(pid) ?? [],
      skills: skillsBy.get(pid) ?? [],
      teamIds,
      managerIds: managerIdsByPerson.get(pid) ?? [],
      capacity: capacity ? { fte: capacity.fte, shrinkagePct: capacity.shrinkagePct, allocationPct: capacity.allocationPct } : undefined,
    }
  }).filter((p): p is NonNullable<typeof p> => Boolean(p))

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    org: {
      id: String(orgRow?.id ?? orgId),
      name: orgRow?.name ? String(orgRow.name) : null,
    },
    people: people.slice(0, 10000), // Hard cap: max 10,000 people
    teams: teamsCapped.map((t: any) => ({
      id: String(t.id),
      name: String(t.name ?? "Team"),
      leadPersonId: t.leadPersonId ? String(t.leadPersonId) : null,
      memberIds: memberIdsByTeam.get(String(t.id)) ?? [],
    })),
    domains: domainsCapped.length > 0 ? domainsCapped.map((d: any) => ({
      id: String(d.id),
      name: String(d.name ?? "Domain"),
    })) : undefined,
    systems: systemsCapped.length > 0 ? systemsCapped.map((s: any) => ({
      id: String(s.id),
      name: String(s.name ?? "System"),
    })) : undefined,
    ownership: ownersCapped.map((o: any) => ({
      entityType: String(o.entityType) as any,
      entityId: String(o.entityId),
      primaryOwnerPersonId: String(o.personId),
    })),
    taxonomy: {
      roles: (taxRoles || []).map((r: any) => String(r.label ?? "")).filter(Boolean),
      skills: (taxSkills || []).map((s: any) => String(s.label ?? "")).filter(Boolean),
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

