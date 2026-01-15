import { prisma } from "@/lib/db"
import type { HealthSignal } from "@/server/org/health/signals"
import { severityFromCount } from "@/server/org/health/signals"

export async function computeMinimalOrgHealth(orgId: string) {
  try {
    // Ownership gaps (teams/domains/systems)
    // Note: owner_assignments table may not exist if migrations haven't been run
    let owners: any[] = []
    try {
      // Check if model exists
      const ownerModel = (prisma as any).ownerAssignment
      if (!ownerModel || typeof ownerModel.findMany !== "function") {
        console.warn("[computeMinimalOrgHealth] ownerAssignment model not available");
        owners = []
      } else {
        // Try to query, but handle missing table gracefully
        // Note: OwnerAssignment model uses workspaceId, not orgId
        try {
          owners = await ownerModel.findMany({
            where: { workspaceId: orgId, isPrimary: true } as any,
            select: { entityType: true, entityId: true } as any,
            take: 200000,
          } as any)
        } catch (queryError: any) {
          // Handle Prisma errors - P2021 = table does not exist
          const errorCode = queryError?.code
          const errorMessage = String(queryError?.message || "")
          const errorName = queryError?.name || ""
          
          // Check for table not found errors
          if (
            errorCode === "P2021" || 
            errorName === "PrismaClientKnownRequestError" ||
            errorMessage.includes("does not exist") || 
            errorMessage.includes("owner_assignments") ||
            errorMessage.includes("The table")
          ) {
            console.warn("[computeMinimalOrgHealth] owner_assignments table does not exist - migrations may be needed");
            owners = []
          } else {
            console.error("[computeMinimalOrgHealth] Error in ownerAssignment.findMany:", queryError);
            owners = []
          }
        }
      }
    } catch (error: any) {
      // Handle any other errors (including Prisma client initialization errors)
      const errorMessage = String(error?.message || "")
      if (errorMessage.includes("does not exist") || errorMessage.includes("owner_assignments")) {
        console.warn("[computeMinimalOrgHealth] owner_assignments table does not exist");
        owners = []
      } else {
        console.error("[computeMinimalOrgHealth] Error accessing ownerAssignment model:", error);
        owners = []
      }
    }
    const owned = new Set<string>()
    for (const o of owners) owned.add(`${String((o as any).entityType)}::${String((o as any).entityId)}`)

    const [teams, domains, systems] = await Promise.all([
    prisma.orgTeam.findMany({ where: { workspaceId: orgId } as any, select: { id: true } as any, take: 50000 }).catch(() => [] as any[]),
    prisma.domain.findMany({ where: { orgId } as any, select: { id: true } as any, take: 50000 }).catch(() => [] as any[]),
    prisma.systemEntity.findMany({ where: { orgId } as any, select: { id: true } as any, take: 50000 }).catch(() => [] as any[]),
  ])

    let unownedCount = 0
    for (const t of teams) if (!owned.has(`TEAM::${String((t as any).id)}`)) unownedCount++
    for (const d of domains) if (!owned.has(`DOMAIN::${String((d as any).id)}`)) unownedCount++
    for (const s of systems) if (!owned.has(`SYSTEM::${String((s as any).id)}`)) unownedCount++

    // Availability freshness (stale if updatedAt older than 14 days) - best-effort
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const staleAvailability = await prisma.personAvailabilityHealth
      .count({ where: { orgId, updatedAt: { lt: cutoff } } as any })
      .catch(() => 0)

    // Manager conflicts (best-effort model) - model may not exist
    let managerConflicts = 0
    try {
      if ((prisma as any).personManagerConflict && typeof ((prisma as any).personManagerConflict.count) === "function") {
        managerConflicts = await ((prisma as any).personManagerConflict.count({ where: { orgId } as any }).catch(() => 0))
      }
    } catch {
      managerConflicts = 0
    }

    // Over-allocation (best-effort) - model may not exist
    let overallocation = 0
    try {
      if ((prisma as any).capacityOverallocation && typeof ((prisma as any).capacityOverallocation.count) === "function") {
        overallocation = await ((prisma as any).capacityOverallocation.count({ where: { orgId } as any }).catch(() => 0))
      }
    } catch {
      overallocation = 0
    }

    // Unowned systems as a separate spotlight (systems are execution-critical)
    let unownedSystems = 0
    for (const s of systems) if (!owned.has(`SYSTEM::${String((s as any).id)}`)) unownedSystems++

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
  } catch (error: any) {
    console.error("[computeMinimalOrgHealth] Unexpected error:", error);
    // Return safe defaults
    return {
      trustScore: 0,
      signals: [],
    }
  }
}

