import { prisma } from "@/lib/db"

export type CompletenessItem = {
  key: string
  title: string
  description: string
  status: "DONE" | "PARTIAL" | "MISSING"
  score: number // 0..100
  href: string
}

export async function computeOrgHealthCompleteness(workspaceId: string): Promise<{
  overallScore: number
  items: CompletenessItem[]
}> {
  const [
    peopleCount,
    teamCount,
    capacityProfiles,
    allocations,
    availabilityRows,
    roleRows,
    ownerPrimary,
    managerLinks,
  ] = await Promise.all([
    prisma.orgPosition.count({
      where: { workspaceId, isActive: true, userId: { not: null } },
    }).catch(() => 0),
    prisma.orgTeam.count({
      where: { workspaceId, isActive: true },
    }).catch(() => 0),

    prisma.personCapacity.count({ where: { workspaceId } }).catch(() => 0),
    prisma.capacityAllocation.count({ where: { workspaceId } }).catch(() => 0),

    prisma.personAvailability.count({ where: { workspaceId } }).catch(() => 0),
    prisma.personRoleAssignment.count({ where: { workspaceId } }).catch(() => 0),

    prisma.ownerAssignment.count({
      where: { workspaceId, isPrimary: true },
    }).catch(() => 0),

    prisma.personManagerLink.count({ where: { workspaceId } }).catch(() => 0),
  ])

  const p = Number(peopleCount ?? 0)
  const t = Number(teamCount ?? 0)

  const items: CompletenessItem[] = []

  // People + Teams baseline
  {
    const status = p > 0 && t > 0 ? "DONE" : p > 0 || t > 0 ? "PARTIAL" : "MISSING"
    const score = status === "DONE" ? 100 : status === "PARTIAL" ? 55 : 0
    items.push({
      key: "baseline",
      title: "People & teams baseline",
      description: "Add people and teams so Org Health can compute meaningful capacity, ownership, and structure signals.",
      status,
      score,
      href: "/org",
    })
  }

  // Capacity profiles (FTE + shrinkage)
  {
    const ratio = p > 0 ? Number(capacityProfiles) / p : 0
    const status = ratio >= 0.8 ? "DONE" : ratio >= 0.25 ? "PARTIAL" : "MISSING"
    const score = Math.round(Math.min(100, ratio * 120))
    items.push({
      key: "capacity_profiles",
      title: "Capacity profiles (FTE + shrinkage)",
      description: "Add FTE and shrinkage to compute available capacity and avoid misleading overload signals.",
      status,
      score,
      href: "/org/health/capacity",
    })
  }

  // Allocations
  {
    const status = Number(allocations) > 0 ? "DONE" : "MISSING"
    const score = status === "DONE" ? 100 : 0
    items.push({
      key: "allocations",
      title: "Allocations",
      description: "Add allocations to teams/projects so demand can be compared against supply.",
      status,
      score,
      href: "/org/health/capacity",
    })
  }

  // Availability now
  {
    const ratio = p > 0 ? Number(availabilityRows) / p : 0
    const status = ratio >= 0.6 ? "DONE" : ratio >= 0.15 ? "PARTIAL" : "MISSING"
    const score = Math.round(Math.min(100, ratio * 140))
    items.push({
      key: "availability",
      title: "Availability now",
      description: "Mark who is available, limited, or unavailable to reflect today's delivery reality.",
      status,
      score,
      href: "/org/health/capacity",
    })
  }

  // Roles
  {
    const ratio = p > 0 ? Number(roleRows) / p : 0
    const status = ratio >= 0.7 ? "DONE" : ratio >= 0.2 ? "PARTIAL" : "MISSING"
    const score = Math.round(Math.min(100, ratio * 130))
    items.push({
      key: "roles",
      title: "Role mix",
      description: "Assign roles so we can detect role gaps (PM/Design/QA coverage).",
      status,
      score,
      href: "/org/health/capacity",
    })
  }

  // Owners
  {
    // Roughly expect at least teamCount primary owners when teams exist.
    const expected = Math.max(1, t)
    const ratio = expected > 0 ? Number(ownerPrimary) / expected : 0
    const status = t === 0 ? "MISSING" : ratio >= 0.85 ? "DONE" : ratio >= 0.3 ? "PARTIAL" : "MISSING"
    const score = t === 0 ? 0 : Math.round(Math.min(100, ratio * 115))
    items.push({
      key: "ownership",
      title: "Primary owners",
      description: "Assign primary owners to teams/domains/systems for accountability.",
      status,
      score,
      href: "/org/health/ownership",
    })
  }

  // Manager links
  {
    const ratio = p > 0 ? Number(managerLinks) / p : 0
    const status = ratio >= 0.7 ? "DONE" : ratio >= 0.2 ? "PARTIAL" : "MISSING"
    const score = Math.round(Math.min(100, ratio * 130))
    items.push({
      key: "manager_links",
      title: "Manager links",
      description: "Add manager links to compute spans of control and reporting layers accurately.",
      status,
      score,
      href: "/org/health/management-load",
    })
  }

  // Overall score: weighted average (baseline has heavier weight)
  const weights: Record<string, number> = {
    baseline: 1.6,
    capacity_profiles: 1.2,
    allocations: 1.0,
    availability: 1.0,
    roles: 1.0,
    ownership: 1.2,
    manager_links: 1.0,
  }

  const totalW = items.reduce((sum, it) => sum + (weights[it.key] ?? 1), 0)
  const weighted = items.reduce((sum, it) => sum + it.score * (weights[it.key] ?? 1), 0)
  const overallScore = totalW > 0 ? Math.round(weighted / totalW) : 0

  return { overallScore, items }
}

