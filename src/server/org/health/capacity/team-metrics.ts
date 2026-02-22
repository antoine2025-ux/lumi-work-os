import { prisma } from "@/lib/db"
import { getTeamMemberships } from "@/server/org/health/team-membership"
import { DEFAULT_ROLE_REQUIREMENTS, toCanonicalRole } from "@/server/org/health/capacity/roles"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

type TeamMetric = {
  teamId: string
  teamName: string
  supplyAvailFte: number
  demandFte: number
  slackFte: number
  utilizationPct: number
  roleMixTop: Array<{ role: string; percent: number }>
  canonicalRoleCoverage: Array<{ role: string; percent: number }>
  missingRoles: Array<{ role: string; currentPercent: number; minPercent: number }>
}

type Inputs = {
  orgId: string
}

export async function computeTeamCapacityMetrics({ orgId }: Inputs): Promise<{
  metrics: TeamMetric[]
  hasMembership: boolean
  hasCapacityData: boolean
}> {
  const [teams, memberships] = await Promise.all([
    prisma.orgTeam.findMany({
      where: { workspaceId: orgId },
      select: { id: true, name: true },
      take: 2000,
    }).catch(() => []),
    getTeamMemberships(orgId),
  ])

  const teamNameById = new Map<string, string>()
  for (const t of teams || []) teamNameById.set(String(t.id), t.name ?? "Untitled team")

  // Capacity profiles (FTE + shrinkage)
  const profiles = await prisma.personCapacity.findMany({
    where: { orgId },
    select: { personId: true, fte: true, shrinkagePct: true },
    take: 50000,
  }).catch(() => [])

  const hasCapacityData = Array.isArray(profiles) && profiles.length > 0

  // Availability now
  const now = Date.now()
  const availability = await prisma.personAvailability.findMany({
    where: { workspaceId: orgId },
    select: { personId: true, type: true, startDate: true, endDate: true },
    take: 50000,
  }).catch(() => [])

  const availabilityByPerson = new Map<string, string>()
  for (const a of availability || []) {
    const startsOk = new Date(a.startDate).getTime() <= now
    const endsOk = !a.endDate || new Date(a.endDate).getTime() >= now
    if (!startsOk || !endsOk) continue
    availabilityByPerson.set(String(a.personId), String(a.type))
  }

  // Allocations (team demand)
  const allocations = await prisma.capacityAllocation.findMany({
    where: { orgId },
    select: { personId: true, teamId: true, percent: true, startsAt: true, endsAt: true },
    take: 200000,
  }).catch(() => [])

  // Role assignments (optional)
  const roles = await prisma.personRoleAssignment.findMany({
    where: { orgId },
    select: { personId: true, role: true, percent: true },
    take: 200000,
  }).catch(() => [])

  const roleByPerson = new Map<string, Array<{ role: string; percent: number }>>()
  for (const r of roles || []) {
    const pid = String(r.personId)
    const list = roleByPerson.get(pid) ?? []
    list.push({ role: String(r.role), percent: Number(r.percent ?? 100) })
    roleByPerson.set(pid, list)
  }

  // Map: team -> set(person)
  const peopleByTeam = new Map<string, Set<string>>()
  for (const m of memberships) {
    const set = peopleByTeam.get(m.teamId) ?? new Set<string>()
    set.add(m.personId)
    peopleByTeam.set(m.teamId, set)
  }

  const hasMembership = memberships.length > 0

  // Helper to compute a person's available-now FTE
  const profileByPerson = new Map<string, { fte: number; shrinkagePct: number }>()
  for (const p of profiles || []) {
    profileByPerson.set(String(p.personId), {
      fte: Number(p.fte ?? 1),
      shrinkagePct: clamp(Number(p.shrinkagePct ?? 20), 0, 95),
    })
  }

  function availableNowFte(personId: string) {
    const prof = profileByPerson.get(personId)
    const fte = prof ? prof.fte : 1
    const shrink = prof ? prof.shrinkagePct : 20
    const baseAvail = Math.max(0, fte * (1 - shrink / 100))

    const st = (availabilityByPerson.get(personId) ?? "AVAILABLE").toUpperCase()
    const mult = st === "UNAVAILABLE" ? 0 : st === "PARTIAL" ? 0.5 : 1
    return baseAvail * mult
  }

  // Demand per team in FTE (sum percent/100 across active allocations with teamId)
  const demandByTeam = new Map<string, number>()
  for (const a of allocations || []) {
    if (!a.teamId) continue
    const startsOk = !a.startsAt || new Date(a.startsAt).getTime() <= now
    const endsOk = !a.endsAt || new Date(a.endsAt).getTime() >= now
    if (!startsOk || !endsOk) continue
    const teamId = String(a.teamId)
    const prev = demandByTeam.get(teamId) ?? 0
    demandByTeam.set(teamId, prev + Number(a.percent ?? 0) / 100)
  }

  // Supply per team from membership (sum availableNowFte for members)
  const metrics: TeamMetric[] = []

  for (const [teamId, personSet] of peopleByTeam.entries()) {
    const teamName = teamNameById.get(teamId) ?? `Team ${teamId.slice(0, 8)}`

    let supplyAvailFte = 0
    const roleAgg = new Map<string, number>()
    const canonicalAgg = new Map<string, number>()

    for (const pid of personSet.values()) {
      const avail = availableNowFte(pid)
      supplyAvailFte += avail

      // role mix aggregation weighted by availability
      const rl = roleByPerson.get(pid)
      if (rl && rl.length) {
        for (const r of rl) {
          const w = avail * (Number(r.percent ?? 100) / 100)
          roleAgg.set(r.role, (roleAgg.get(r.role) ?? 0) + w)
          const canon = toCanonicalRole(r.role)
          canonicalAgg.set(canon, (canonicalAgg.get(canon) ?? 0) + w)
        }
      }
    }

    const demandFte = demandByTeam.get(teamId) ?? 0
    const slackFte = supplyAvailFte - demandFte
    const utilizationPct = supplyAvailFte <= 0 ? 0 : clamp((demandFte / supplyAvailFte) * 100, 0, 300)

    const roleAggTotal = Array.from(roleAgg.values()).reduce((a, b) => a + b, 0)
    const roleMixTop = Array.from(roleAgg.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([role, v]) => ({
        role,
        percent: roleAggTotal <= 0 ? 0 : Math.round((v / roleAggTotal) * 100),
      }))

    const canonicalTotal = Array.from(canonicalAgg.values()).reduce((a, b) => a + b, 0)
    const canonicalRoleCoverage = Array.from(canonicalAgg.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([role, v]) => ({
        role,
        percent: canonicalTotal <= 0 ? 0 : Math.round((v / canonicalTotal) * 100),
      }))

    const coverageByRole = new Map(canonicalRoleCoverage.map((x) => [x.role, x.percent]))
    const missingRoles = DEFAULT_ROLE_REQUIREMENTS
      .map((req) => {
        const current = coverageByRole.get(req.role) ?? 0
        if (current >= req.minPercent) return null
        return { role: req.role, currentPercent: current, minPercent: req.minPercent }
      })
      .filter(Boolean) as Array<{ role: string; currentPercent: number; minPercent: number }>

    metrics.push({
      teamId,
      teamName,
      supplyAvailFte: Number(supplyAvailFte.toFixed(2)),
      demandFte: Number(demandFte.toFixed(2)),
      slackFte: Number(slackFte.toFixed(2)),
      utilizationPct: Math.round(utilizationPct),
      roleMixTop,
      canonicalRoleCoverage,
      missingRoles,
    })
  }

  // Sort: most constrained first (lowest slack)
  metrics.sort((a, b) => a.slackFte - b.slackFte)

  return { metrics, hasMembership, hasCapacityData }
}

