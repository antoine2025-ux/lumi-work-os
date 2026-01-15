import { prisma } from "@/lib/db"
import { computeTeamCapacityMetrics } from "@/server/org/health/capacity/team-metrics"
import { findUnownedEntities } from "@/server/org/health/ownership/scan"
import { computeManagementLoad } from "@/server/org/health/management/metrics"
import { computeStructureMetrics } from "@/server/org/health/structure/metrics"
import { computeLayerMetrics } from "@/server/org/health/structure/layers"

/**
 * v0 deep-dive data shapes.
 * These are intentionally minimal and defensive; tighten types once your schema is stable.
 */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export async function getCapacityDeepDive(orgId: string) {
  // In this codebase, orgId may be workspaceId, so we query by workspaceId.
  const [peopleCount, teams] = await Promise.all([
    prisma.orgPosition
      .count({
        where: {
          workspaceId: orgId,
          isActive: true,
          userId: { not: null },
        },
      })
      .catch(() => null),
    prisma.orgTeam
      .findMany({
        where: {
          workspaceId: orgId,
          isActive: true,
        },
        select: { id: true, name: true },
        take: 200,
      })
      .catch(() => []),
  ])

  const p = typeof peopleCount === "number" ? peopleCount : 0
  const t = Array.isArray(teams) ? teams.length : 0

  let capacityStats: Array<{ label: string; value: string | number }> = []
  let hotspots: Array<{ id: string; name: string; note?: string }> = []

  try {
    const profiles = await prisma.personCapacity?.findMany?.({
      where: { orgId },
      select: { personId: true, fte: true, shrinkagePct: true } as any,
      take: 2000,
    } as any)

    const allocations = await prisma.capacityAllocation?.findMany?.({
      where: { orgId },
      select: { personId: true, percent: true } as any,
      take: 20000,
    } as any)

    if (Array.isArray(profiles) && profiles.length > 0) {
      const allocByPerson = new Map<string, number>()
      if (Array.isArray(allocations)) {
        for (const a of allocations) {
          const key = String(a.personId)
          allocByPerson.set(key, (allocByPerson.get(key) ?? 0) + Number(a.percent ?? 0))
        }
      }

      let totalFte = 0
      let totalAvail = 0
      let over = 0

      for (const pr of profiles) {
        const fte = Number(pr.fte ?? 1)
        const shrink = clamp(Number(pr.shrinkagePct ?? 20), 0, 95)
        const avail = Math.max(0, fte * (1 - shrink / 100))
        const allocPct = allocByPerson.get(String(pr.personId)) ?? 0
        const util = allocPct / 100

        totalFte += fte
        totalAvail += avail
        if (util > 1.05) over += 1
      }

      capacityStats = [
        { label: "Total FTE", value: totalFte.toFixed(1) },
        { label: "Available FTE (after shrinkage)", value: totalAvail.toFixed(1) },
        { label: "Over-allocated people", value: over },
      ]

      if (over > 0) {
        hotspots = profiles
          .slice(0, 20)
          .map((pr: any) => {
            const allocPct = allocByPerson.get(String(pr.personId)) ?? 0
            const fte = Number(pr.fte ?? 1)
            const shrink = clamp(Number(pr.shrinkagePct ?? 20), 0, 95)
            const avail = Math.max(0, fte * (1 - shrink / 100))
            const util = allocPct / 100
            if (util <= 1.05) return null
            return {
              id: String(pr.personId),
              name: `Person ${String(pr.personId).slice(0, 8)}`,
              note: `Allocated ${Math.round(allocPct)}% vs available ${avail.toFixed(2)} FTE (shrinkage ${Math.round(shrink)}%).`,
            }
          })
          .filter(Boolean) as any
      }
    }
  } catch {
    // ignore; v0 fallback
  }

  // True team supply vs demand (if membership exists)
  try {
    const team = await computeTeamCapacityMetrics({ orgId })
    if (team.hasMembership && team.metrics.length > 0) {
      capacityStats = capacityStats.length
        ? capacityStats
        : [
            { label: "People recorded", value: p },
            { label: "Teams recorded", value: t },
          ]

      // Replace table with team metrics table
      hotspots = team.metrics.slice(0, 20).map((m) => ({
        id: m.teamId,
        name: m.teamName,
        note: `Supply ${m.supplyAvailFte.toFixed(1)} FTE · Demand ${m.demandFte.toFixed(1)} FTE · Slack ${m.slackFte.toFixed(1)} · Util ${m.utilizationPct}%` +
          (m.roleMixTop.length ? ` · Roles ${m.roleMixTop.map((r) => `${r.role} ${r.percent}%`).join(", ")}` : "") +
          (m.missingRoles && m.missingRoles.length
            ? ` · Missing ${m.missingRoles.slice(0, 3).map((x) => `${x.role} (${x.currentPercent}%<${x.minPercent}%)`).join(", ")}`
            : ""),
      }))
    }
  } catch {
    // ignore
  }

  const recs: string[] = []
  if (p === 0) recs.push("Add people to the org to unlock accurate capacity and availability signals.")
  if (t === 0) recs.push("Create teams so capacity can be reasoned about per team/project.")
  if (t > 0 && p / t < 2) recs.push("Consider consolidating teams: fragmentation increases coordination and makes capacity look worse than it is.")

  return {
    headline: "Capacity coverage",
    summary:
      "Tracks whether teams and projects have enough available people to deliver. This is a v0 view and will evolve into availability + shrinkage + staffing by role.",
    stats: capacityStats.length
      ? capacityStats
      : [
          { label: "People recorded", value: p },
          { label: "Teams recorded", value: t },
        ],
    recommendations: recs.length ? recs : ["Capacity baseline looks stable. Next iterations will add role mix + shrinkage."],
    table: hotspots.length
      ? hotspots
      : (teams || []).slice(0, 50).map((x) => ({
          id: x.id,
          name: x.name ?? "Untitled team",
          note: "Team capacity details coming next (roles, availability, assignments).",
        })),
  }
}

export async function getOwnershipDeepDive(orgId: string) {
  try {
    const unowned = await findUnownedEntities(orgId).catch((error) => {
      console.error("[getOwnershipDeepDive] Error finding unowned entities:", error)
      return [] as any[]
    })

    const recs: string[] = []
    if (unowned.length > 0) {
      recs.push("Assign a primary owner for every team/domain/system. Ownership clarity reduces delivery risk and improves decision speed.")
      recs.push("Use secondary owners for shared responsibilities (later step).")
    } else {
      recs.push("Ownership baseline looks healthy across teams/domains/systems.")
    }

    return {
      headline: "Ownership coverage",
      summary:
        "Tracks whether key entities have clear owners (teams, domains, systems). v0 focuses on teams; later expands to domains/projects/components.",
      stats: [
        { label: "Unowned entities", value: unowned.length },
        { label: "Coverage scope", value: 3 }, // teams + domains + systems
      ],
      recommendations: recs,
      unowned,
    }
  } catch (error: any) {
    console.error("[getOwnershipDeepDive] Unexpected error:", error)
    // Return a safe default structure
    return {
      headline: "Ownership coverage",
      summary: "Error loading ownership data. Please try again.",
      stats: [
        { label: "Unowned entities", value: 0 },
        { label: "Coverage scope", value: 3 },
      ],
      recommendations: ["Unable to load ownership data. Please refresh the page."],
      unowned: [],
    }
  }
}

export async function getManagementLoadDeepDive(orgId: string) {
  const mgmt = await computeManagementLoad(orgId)

  const recs: string[] = []
  if (mgmt.missingManagerLinks > 0) recs.push("Assign managers for people missing manager links to clarify accountability and reduce operational load.")
  if (mgmt.managerMetrics.some((m) => m.risk === "HIGH")) recs.push("Reduce span of control for overloaded managers by adding leads or splitting teams.")
  if (recs.length === 0) recs.push("Management load baseline looks healthy. Next iterations will add span-of-control distribution and manager coverage by org layer.")

  return {
    headline: "Management load",
    summary:
      "Estimates coordination overhead and management burden. Uses manager links and span-of-control thresholds (v0).",
    stats: [
      { label: "Management score", value: typeof mgmt.score === "number" ? `${mgmt.score}/100` : "—" },
      { label: "Missing manager links", value: mgmt.missingManagerLinks },
      { label: "Overloaded managers", value: mgmt.managerMetrics.filter((m) => m.risk === "HIGH").length },
    ],
    recommendations: recs,
    table: mgmt.managerMetrics.map((m) => ({
      id: m.managerId,
      name: m.managerLabel,
      note: `${m.directReports} direct reports · Risk ${m.risk}`,
    })),
  }
}

export async function getStructureDeepDive(orgId: string) {
  const st = await computeStructureMetrics(orgId)

  let lm = null as null | Awaited<ReturnType<typeof computeLayerMetrics>>
  try {
    lm = await computeLayerMetrics(orgId)
  } catch {
    lm = null
  }

  const recs: string[] = []
  if (st.orphanTeams > 0) recs.push("Clean up orphan teams: archive, merge, or assign members so ownership and capacity signals stay accurate.")
  if (st.peopleCount > 0 && st.fragmentationRatio > 0.45) recs.push("Reduce fragmentation: consolidate teams or clarify scopes to lower coordination overhead.")

  if (lm?.maxDepth && lm.maxDepth >= 7) recs.push("Reduce reporting layers (deep chains slow decisions and add overhead).")
  if (lm?.missingManagerLinks && lm.missingManagerLinks > 0) recs.push("Complete manager links so layers and management load analysis becomes accurate.")
  if (lm?.managerlessClusters && lm.peopleCount > 0 && lm.managerlessClusters > Math.max(6, Math.round(lm.peopleCount * 0.1))) {
    recs.push("Consolidate reporting roots by clarifying managers and reducing graph fragmentation.")
  }

  if (recs.length === 0) recs.push("Structure baseline looks healthy. Next iterations will add org layers visualizations and guided refactors.")

  const table = [
    { id: "note_1", name: "Structure notes", note: st.notes.length ? st.notes.join(" ") : "No structural issues detected." },
  ]

  if (lm) {
    table.push({
      id: "layers_1",
      name: "Reporting layers",
      note: `Max depth ${lm.maxDepth} · Avg depth ${lm.avgDepth} · Roots ${lm.managerlessClusters} · Missing links ${lm.missingManagerLinks}`,
    })
    table.push({
      id: "layers_2",
      name: "Depth distribution",
      note: lm.depthHistogram.map((x) => `L${x.depth}:${x.count}`).join(" · "),
    })
  }

  return {
    headline: "Structure & org design",
    summary:
      "Evaluates structural balance and coordination overhead. Uses fragmentation, orphan teams, and reporting layer depth (v1).",
    stats: [
      { label: "Structure score", value: typeof st.score === "number" ? `${st.score}/100` : "—" },
      { label: "Orphan teams", value: st.orphanTeams },
      { label: "Max depth", value: lm ? lm.maxDepth : "—" },
      { label: "Roots", value: lm ? lm.managerlessClusters : "—" },
    ],
    recommendations: recs,
    table,
    orgDesign: lm
      ? {
          maxDepth: lm.maxDepth,
          avgDepth: lm.avgDepth,
          roots: lm.managerlessClusters,
          missingLinks: lm.missingManagerLinks,
        }
      : null,
  }
}

