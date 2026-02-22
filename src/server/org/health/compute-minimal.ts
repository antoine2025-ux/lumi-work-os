import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { HealthSignal } from "@/server/org/health/signals"
import { severityFromCount } from "@/server/org/health/signals"

export async function computeMinimalOrgHealth(orgId: string) {
  try {
    // Ownership gaps (teams/domains/systems)
    // OwnerAssignment uses workspaceId (orgId param is the workspace identifier)
    let owners: Array<{ entityType: string; entityId: string }> = []
    try {
      owners = await prisma.ownerAssignment.findMany({
        where: { workspaceId: orgId, isPrimary: true },
        select: { entityType: true, entityId: true },
        take: 200000,
      })
    } catch (queryError: unknown) {
      if (
        queryError instanceof Prisma.PrismaClientKnownRequestError &&
        queryError.code === "P2021"
      ) {
        console.warn("[computeMinimalOrgHealth] owner_assignments table does not exist - migrations may be needed");
      } else if (
        queryError instanceof Error &&
        (queryError.message.includes("does not exist") || queryError.message.includes("owner_assignments"))
      ) {
        console.warn("[computeMinimalOrgHealth] owner_assignments table does not exist");
      } else {
        console.error("[computeMinimalOrgHealth] Error in ownerAssignment.findMany:", queryError);
      }
      owners = []
    }

    const owned = new Set<string>()
    for (const o of owners) owned.add(`${o.entityType}::${o.entityId}`)

    const [teams, domains, systems] = await Promise.all([
      prisma.orgTeam.findMany({ where: { workspaceId: orgId }, select: { id: true }, take: 50000 }).catch(() => []),
      prisma.domain.findMany({ where: { orgId }, select: { id: true }, take: 50000 }).catch(() => []),
      prisma.systemEntity.findMany({ where: { orgId }, select: { id: true }, take: 50000 }).catch(() => []),
    ])

    let unownedCount = 0
    for (const t of teams) if (!owned.has(`TEAM::${t.id}`)) unownedCount++
    for (const d of domains) if (!owned.has(`DOMAIN::${d.id}`)) unownedCount++
    for (const s of systems) if (!owned.has(`SYSTEM::${s.id}`)) unownedCount++

    // Availability freshness (stale if updatedAt older than 14 days) - best-effort
    // PersonAvailabilityHealth uses workspaceId (not orgId)
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const staleAvailability = await prisma.personAvailabilityHealth
      .count({ where: { workspaceId: orgId, updatedAt: { lt: cutoff } } })
      .catch(() => 0)

    // Manager conflicts and over-allocation: these models (personManagerConflict,
    // capacityOverallocation) are not yet in the schema. Hardcoded to 0 until
    // the relevant migrations are added.
    const managerConflicts = 0
    const overallocation = 0

    // Unowned systems as a separate spotlight (systems are execution-critical)
    let unownedSystems = 0
    for (const s of systems) if (!owned.has(`SYSTEM::${s.id}`)) unownedSystems++

    const signals: HealthSignal[] = [
      {
        key: "OWNERSHIP_GAPS",
        severity: severityFromCount(unownedCount, { high: 25, warn: 5 }),
        title: "Ownership gaps",
        description: "Entities without a primary owner reduce accountability and incident readiness.",
        count: unownedCount,
        href: "/org/ownership",
      },
      {
        key: "STALE_AVAILABILITY",
        severity: severityFromCount(staleAvailability, { high: 50, warn: 10 }),
        title: "Stale availability",
        description: "Availability not updated recently reduces confidence in capacity signals.",
        count: staleAvailability,
        href: "/org/people",
      },
      {
        key: "MANAGER_CONFLICTS",
        severity: severityFromCount(managerConflicts, { high: 10, warn: 1 }),
        title: "Manager conflicts",
        description: "Conflicting reporting lines create ambiguity for responsibility and planning.",
        count: managerConflicts,
        href: "/org/chart",
      },
      {
        key: "OVERALLOCATION",
        severity: severityFromCount(overallocation, { high: 25, warn: 5 }),
        title: "Over-allocation",
        description: "Planned allocations exceed effective capacity for some people.",
        count: overallocation,
        href: "/org/people",
      },
      {
        key: "UNOWNED_SYSTEMS",
        severity: severityFromCount(unownedSystems, { high: 10, warn: 1 }),
        title: "Unowned systems",
        description: "Systems without a primary owner are high operational risk.",
        count: unownedSystems,
        href: "/org/ownership",
      },
    ]

    // Return a minimal "trust score" (0–100) based on signal severities
    const penalty =
      signals.reduce((sum, s) => {
        if (s.severity === "HIGH") return sum + 25
        if (s.severity === "WARNING") return sum + 10
        return sum
      }, 0) || 0

    const trustScore = Math.max(0, Math.min(100, 100 - penalty))

    return { trustScore, signals }
  } catch (error: unknown) {
    console.error("[computeMinimalOrgHealth] Unexpected error:", error);
    return {
      trustScore: 0,
      signals: [],
    }
  }
}
