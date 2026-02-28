import { prisma } from "@/lib/db"
import { computeTeamCapacityMetrics } from "@/server/org/health/capacity/team-metrics"
import { findUnownedEntities } from "@/server/org/health/ownership/scan"
import { computeOwnershipCoverageScore } from "@/server/org/health/ownership/score"
import { computeManagementLoad } from "@/server/org/health/management/metrics"
import { computeStructureMetrics } from "@/server/org/health/structure/metrics"
import { computeLayerMetrics } from "@/server/org/health/structure/layers"
import { computeOrgHealthCompleteness } from "@/server/org/health/setup/completeness"
import { getDataQualityDeepDive } from "@/server/org/health/data-quality"
import { getFreshnessSummary } from "@/server/org/health/freshness"
import { PHASE_C_VERSION } from "@/server/org/health/phaseC"

type ComputeInput = {
  orgId: string
}

type PersonCapacityRow = { personId: string; fte: number; shrinkagePct: number }
type CapacityAllocationRow = { personId: string; percent: number | null; teamId: string | null; startsAt: Date | null; endsAt: Date | null }
type PersonAvailabilityTypeRow = { personId: string; type: string; startDate: Date; endDate: Date | null }
type OrgTeamNameRow = { id: string; name: string | null }

type SignalType = "CAPACITY" | "OWNERSHIP" | "STRUCTURE" | "MANAGEMENT_LOAD" | "DATA_QUALITY"
type Severity = "INFO" | "WARNING" | "CRITICAL"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export type ComputedHealth = {
  snapshot: {
    capturedAt: Date
    capacityScore?: number
    ownershipScore?: number
    balanceScore?: number
    managementScore?: number
    dataQualityScore?: number
    phaseCVersion?: string
  }
  signals: Array<{
    type: SignalType
    severity: Severity
    title: string
    description: string
    contextType?: string
    contextId?: string
    contextLabel?: string
    href?: string
  }>
}

/**
 * Phase C: v0 computation.
 * - Deterministic and safe.
 * - Uses minimal existing data; falls back when models/relations differ across branches.
 * - Replace logic in later steps with real capacity, ownership, and structure analysis.
 */
export async function computeOrgHealth({ orgId }: ComputeInput): Promise<ComputedHealth> {
  // Best-effort queries: keep them defensive so this compiles across evolving schema.
  // In this codebase, orgId may be workspaceId, so we query by workspaceId.
  // If your repo already has strong typed Org/People models, tighten these in later steps.

  const signals: ComputedHealth["signals"] = []

  const [peopleCount, teamsCount] = await Promise.all([
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
      .count({
        where: {
          workspaceId: orgId,
          isActive: true,
        },
      })
      .catch(() => null),
  ])

  // Heuristic mock scoring (0..100)
  const p = typeof peopleCount === "number" ? peopleCount : 0
  const t = typeof teamsCount === "number" ? teamsCount : 0

  // Capacity: more people -> higher, but with diminishing returns
  let capacityScore = Math.max(15, Math.min(95, Math.round(30 + Math.log10(p + 1) * 35)))

  // If capacity primitives exist, compute "available capacity" signal from real data.
  try {
    const profiles = await prisma.personCapacity.findMany({
      where: { workspaceId: orgId },
      select: { fte: true, shrinkagePct: true, personId: true },
      take: 2000,
    }).catch(() => null) as PersonCapacityRow[] | null

    const allocations = await prisma.capacityAllocation.findMany({
      where: { workspaceId: orgId },
      select: { personId: true, percent: true, teamId: true, endsAt: true, startsAt: true },
      take: 20000,
    }).catch(() => null) as CapacityAllocationRow[] | null

    if (Array.isArray(profiles) && profiles.length > 0) {
      const now = Date.now()

      // For each person: availableFte = fte * (1 - shrinkagePct/100)
      // AllocatedPct = sum(active allocations)
      // Utilization = allocatedPct / 100
      // Slack = availableFte * (1 - utilization)
      let totalAvail = 0
      let totalSlack = 0
      let overAllocatedPeople = 0

      const allocByPerson = new Map<string, number>()
      if (Array.isArray(allocations)) {
        for (const a of allocations) {
          const startsOk = !a.startsAt || new Date(a.startsAt).getTime() <= now
          const endsOk = !a.endsAt || new Date(a.endsAt).getTime() >= now
          if (!startsOk || !endsOk) continue
          const key = String(a.personId)
          const prev = allocByPerson.get(key) ?? 0
          allocByPerson.set(key, prev + Number(a.percent ?? 0))
        }
      }

      const allocByTeam = new Map<string, number>()
      if (Array.isArray(allocations)) {
        for (const a of allocations) {
          const startsOk = !a.startsAt || new Date(a.startsAt).getTime() <= now
          const endsOk = !a.endsAt || new Date(a.endsAt).getTime() >= now
          if (!startsOk || !endsOk) continue
          if (!a.teamId) continue
          const key = String(a.teamId)
          const prev = allocByTeam.get(key) ?? 0
          allocByTeam.set(key, prev + Number(a.percent ?? 0))
        }
      }

      const availabilityByPerson = new Map<string, string>()
      try {
        const av = await prisma.personAvailability.findMany({
          where: { workspaceId: orgId },
          select: { personId: true, type: true, startDate: true, endDate: true },
          take: 5000,
        }).catch(() => null) as PersonAvailabilityTypeRow[] | null

        if (Array.isArray(av)) {
          const nowMs = Date.now()
          for (const a of av) {
            const startsOk = !a.startDate || new Date(a.startDate).getTime() <= nowMs
            const endsOk = !a.endDate || new Date(a.endDate).getTime() >= nowMs
            if (!startsOk || !endsOk) continue
            // Map type to status-like values for compatibility
            const statusValue = a.type === "UNAVAILABLE" ? "UNAVAILABLE" : a.type === "PARTIAL" ? "LIMITED" : "AVAILABLE"
            availabilityByPerson.set(String(a.personId), statusValue)
          }
        }
      } catch {
        // ignore
      }

      for (const pr of profiles) {
        const fte = Number(pr.fte ?? 1)
        const shrink = clamp(Number(pr.shrinkagePct ?? 20), 0, 95)
        const avail = Math.max(0, fte * (1 - shrink / 100))
        const status = availabilityByPerson.get(String(pr.personId)) ?? "AVAILABLE"
        const availabilityMultiplier =
          status === "UNAVAILABLE" ? 0 :
          status === "LIMITED" ? 0.5 :
          1
        const availNow = avail * availabilityMultiplier
        const allocPct = clamp(allocByPerson.get(String(pr.personId)) ?? 0, 0, 300)
        const util = allocPct / 100
        const slack = availNow * (1 - util)

        totalAvail += availNow
        totalSlack += slack
        if (util > 1.05) overAllocatedPeople += 1
      }

      // Slack ratio -> score (more slack is better to a point)
      const slackRatio = totalAvail <= 0 ? 0 : totalSlack / totalAvail
      capacityScore = clamp(Math.round(40 + slackRatio * 60), 0, 100)

      if (overAllocatedPeople > 0) {
        signals.push({
          type: "CAPACITY",
          severity: overAllocatedPeople >= 5 ? "CRITICAL" : "WARNING",
          title: "Over-allocation detected",
          description: `${overAllocatedPeople} people appear allocated above 100% of their available capacity. Review allocations or adjust shrinkage.`,
        })
      } else {
        signals.push({
          type: "CAPACITY",
          severity: "INFO",
          title: "Capacity computed from real availability",
          description: "Capacity score is now derived from FTE, shrinkage, and active allocations.",
        })
      }

      // If we can compute true team supply vs demand, prefer that for team signals.
      try {
        const team = await computeTeamCapacityMetrics({ orgId })
        if (team.hasMembership && team.metrics.length > 0) {
          const worst = team.metrics.slice(0, 5)

          for (const tm of worst) {
            // Only signal when constrained
            if (tm.slackFte >= 0) continue

            const severity =
              tm.slackFte <= -2 ? "CRITICAL" :
              tm.slackFte <= -0.75 ? "WARNING" :
              "INFO"

            if (severity === "INFO") continue

            signals.push({
              type: "CAPACITY",
              severity,
              title: "Team under-capacity",
              description: `${tm.teamName} demand exceeds supply by ~${Math.abs(tm.slackFte).toFixed(1)} FTE (utilization ${tm.utilizationPct}%).`,
              contextType: "TEAM",
              contextId: tm.teamId,
              contextLabel: tm.teamName,
              href: `/org/health/capacity?teamId=${encodeURIComponent(tm.teamId)}`,
            })
          }

          // Role gap signals (premium): missing PM/Design/QA etc.
          for (const tm of worst) {
            if (!tm.missingRoles || tm.missingRoles.length === 0) continue

            const topMissing = tm.missingRoles.slice(0, 2)
            const summary = topMissing
              .map((m) => `${m.role} ${m.currentPercent}%<${m.minPercent}%`)
              .join(", ")

            // Only warn/critical if meaningful team size (supply) exists
            if (tm.supplyAvailFte < 1) continue

            const severity =
              tm.missingRoles.length >= 3 ? "CRITICAL" :
              tm.missingRoles.length >= 2 ? "WARNING" :
              "WARNING"

            signals.push({
              type: "CAPACITY",
              severity,
              title: "Role coverage gap",
              description: `${tm.teamName} may be missing key roles (${summary}). Consider rebalancing or assigning coverage.`,
              contextType: "TEAM",
              contextId: tm.teamId,
              contextLabel: tm.teamName,
              href: `/org/health/capacity?teamId=${encodeURIComponent(tm.teamId)}`,
            })
          }
        }
      } catch {
        // fallback: keep existing allocation-only team hotspot logic
      }

      // Team-scoped signals (v0): if allocations have teamId, warn when allocated demand is high vs available supply.
      // This is a proxy until we compute per-team supply precisely (requires person->team membership).
      // Only use this if we didn't already generate team signals from true metrics.
      if (signals.filter((s) => s.type === "CAPACITY" && s.contextType === "TEAM").length === 0 && allocByTeam.size > 0) {
        const teams = await prisma.orgTeam.findMany({
          where: { workspaceId: orgId },
          select: { id: true, name: true },
          take: 200,
        }).catch(() => [] as OrgTeamNameRow[])

        const nameByTeam = new Map<string, string>()
        for (const t of teams || []) nameByTeam.set(String(t.id), t.name ?? "Untitled team")

        // Heuristic: if a team consumes > 250% allocation points in total, it's a coordination hotspot.
        // Later we'll compute team supply (people assigned to the team) and compare demand vs supply.
        const sorted = Array.from(allocByTeam.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

        for (const [teamId, pct] of sorted) {
          const severity = pct >= 600 ? "CRITICAL" : pct >= 350 ? "WARNING" : "INFO"
          if (severity === "INFO") continue

          const label = nameByTeam.get(teamId) ?? `Team ${teamId.slice(0, 8)}`
          signals.push({
            type: "CAPACITY",
            severity,
            title: "Team capacity hotspot",
            description: `${label} has high active allocation demand (~${Math.round(pct)}%). Review staffing, scope, or allocations.`,
            contextType: "TEAM",
            contextId: teamId,
            contextLabel: label,
            href: `/org/health/capacity?teamId=${encodeURIComponent(teamId)}`,
          })
        }
      }
    }
  } catch {
    // keep heuristic fallback silently
  }

  // Ownership: assume better if teams exist; penalize if no teams
  let ownershipScore = t > 0 ? Math.max(20, Math.min(92, 40 + t * 6)) : 18

  try {
    const coverage = await computeOwnershipCoverageScore(orgId)
    if (typeof coverage === "number") ownershipScore = coverage
  } catch {
    // keep heuristic
  }

  // Balance: assume worse if teams >> people (fragmentation) or teams == 0
  const ratio = t === 0 ? 0 : p / t
  let balanceScore =
    t === 0
      ? 22
      : Math.max(20, Math.min(90, Math.round(55 + (Math.min(6, ratio) - 3) * 8)))

  try {
    const st = await computeStructureMetrics(orgId)
    if (typeof st.score === "number") balanceScore = st.score

    if (st.orphanTeams > 0) {
      signals.push({
        type: "STRUCTURE",
        severity: st.orphanTeams >= 5 ? "WARNING" : "INFO",
        title: "Orphan teams detected",
        description: `${st.orphanTeams} teams have no members. Consider removing, merging, or assigning members.`,
        href: "/org/health/structure",
      })
    }

    if (st.peopleCount > 0 && st.fragmentationRatio > 0.45) {
      signals.push({
        type: "STRUCTURE",
        severity: st.fragmentationRatio > 0.7 ? "CRITICAL" : "WARNING",
        title: "High fragmentation",
        description: `Many teams relative to people (teams/people ${st.fragmentationRatio}). Consider consolidating scope to reduce coordination overhead.`,
        href: "/org/health/structure",
      })
    }

    if (typeof st.score === "number" && st.score >= 90) {
      signals.push({
        type: "STRUCTURE",
        severity: "INFO",
        title: "Structure baseline looks healthy",
        description: `Structural balance score is ${st.score}/100.`,
        href: "/org/health/structure",
      })
    }

    // Advanced layer-based signals
    try {
      const lm = await computeLayerMetrics(orgId)

      // Layer bloat: very deep org chains
      if (lm.peopleCount > 0 && lm.maxDepth >= 7) {
        signals.push({
          type: "STRUCTURE",
          severity: lm.maxDepth >= 9 ? "CRITICAL" : "WARNING",
          title: "Deep reporting chain",
          description: `Max reporting depth is ${lm.maxDepth}. Consider reducing layers to improve speed and clarity.`,
          href: "/org/health/structure",
        })
      }

      // High roots / islands
      if (lm.peopleCount > 0 && lm.managerlessClusters > Math.max(6, Math.round(lm.peopleCount * 0.1))) {
        signals.push({
          type: "STRUCTURE",
          severity: "WARNING",
          title: "Fragmented reporting graph",
          description: `Detected ${lm.managerlessClusters} roots (people without managers). Consider completing manager links or consolidating reporting lines.`,
          href: "/org/health/structure",
        })
      }

      // Missing manager links: already signaled under Management Load, but also relevant to structure
      if (lm.missingManagerLinks > 0 && lm.missingManagerLinks >= 15) {
        signals.push({
          type: "STRUCTURE",
          severity: "WARNING",
          title: "Incomplete reporting data",
          description: `${lm.missingManagerLinks} people lack manager links. Structure signals may be incomplete until links are added.`,
          href: "/org/health/structure",
        })
      }
    } catch {
      // ignore
    }
  } catch {
    // keep heuristic
  }

  let managementScore: number | null = null

  if (t === 0) {
    signals.push({
      type: "STRUCTURE",
      severity: "WARNING",
      title: "No teams found",
      description:
        "Org structure has no teams yet. Create at least one team to enable ownership and capacity views.",
    })
  }

  if (p < 5) {
    signals.push({
      type: "CAPACITY",
      severity: "INFO",
      title: "Small org dataset",
      description:
        "Org has very few people recorded. Health metrics are indicative until more people are added.",
    })
  }

  if (t > 0 && p > 0 && ratio < 2) {
    signals.push({
      type: "MANAGEMENT_LOAD",
      severity: "WARNING",
      title: "High fragmentation risk",
      description:
        "Teams may be too granular relative to headcount. Consider consolidating to reduce coordination overhead.",
    })
  }

  // Ownership signals: unowned entities
  try {
    const unowned = await findUnownedEntities(orgId)
    const score = typeof ownershipScore === "number" ? ownershipScore : null
    if (unowned.length > 0) {
      const top = unowned.slice(0, 5)
      for (const e of top) {
        const severity =
          score !== null && score < 60 ? "CRITICAL" :
          score !== null && score < 80 ? "WARNING" :
          unowned.length >= 10 ? "CRITICAL" :
          "WARNING"
        const label = e.entityLabel

        signals.push({
          type: "OWNERSHIP",
          severity,
          title: "Unowned entity",
          description: `${label} has no primary owner assigned. Assign an owner to improve accountability and decision speed.`,
          contextType: e.entityType,
          contextId: e.entityId,
          contextLabel: label,
          href: `/org/health/ownership?type=${encodeURIComponent(e.entityType)}&id=${encodeURIComponent(e.entityId)}`,
        })
      }
    } else {
      signals.push({
        type: "OWNERSHIP",
        severity: "INFO",
        title: "Ownership scan complete",
        description: "No unowned teams detected (primary ownership). Next iterations will include domains/projects/systems.",
      })
    }

    if (typeof ownershipScore === "number" && ownershipScore >= 90) {
      signals.push({
        type: "OWNERSHIP",
        severity: "INFO",
        title: "Strong ownership coverage",
        description: "Primary owners cover most teams/domains/systems. Keep it up by assigning owners as new entities are created.",
      })
    }
  } catch {
    // keep calm; ownership scan is optional until owner assignments are populated
  }

  // Management Load: compute real score + signals
  try {
    const mgmt = await computeManagementLoad(orgId)
    managementScore = mgmt.score

    if (typeof mgmt.score === "number") {
      if (mgmt.score < 60) {
        signals.push({
          type: "MANAGEMENT_LOAD",
          severity: "CRITICAL",
          title: "Management load unhealthy",
          description: `Management load score is ${mgmt.score}/100. High spans of control or missing manager links may be causing delivery risk.`,
          href: "/org/health/management-load",
        })
      } else if (mgmt.score < 80) {
        signals.push({
          type: "MANAGEMENT_LOAD",
          severity: "WARNING",
          title: "Management load needs attention",
          description: `Management load score is ${mgmt.score}/100. Review overloaded managers and missing manager links.`,
          href: "/org/health/management-load",
        })
      } else {
        signals.push({
          type: "MANAGEMENT_LOAD",
          severity: "INFO",
          title: "Management load baseline looks healthy",
          description: `Management load score is ${mgmt.score}/100.`,
          href: "/org/health/management-load",
        })
      }
    }

    if (mgmt.missingManagerLinks > 0) {
      const sev = mgmt.missingManagerLinks >= 10 ? "CRITICAL" : "WARNING"
      signals.push({
        type: "MANAGEMENT_LOAD",
        severity: sev,
        title: "People missing manager links",
        description: `${mgmt.missingManagerLinks} people have no manager assigned. Add manager links to clarify accountability and reduce operational load.`,
        href: "/org/health/management-load",
      })
    }

    const high = mgmt.managerMetrics.filter((m) => m.risk === "HIGH").slice(0, 3)
    for (const m of high) {
      signals.push({
        type: "MANAGEMENT_LOAD",
        severity: "WARNING",
        title: "Overloaded manager",
        description: `${m.managerLabel} has ${m.directReports} direct reports. Consider adding leads or splitting scope.`,
        contextType: "PERSON",
        contextId: m.managerId,
        contextLabel: m.managerLabel,
        href: "/org/health/management-load",
      })
    }
  } catch {
    // ignore; keep existing behavior
  }

  // Data completeness signal (premium honesty)
  try {
    const comp = await computeOrgHealthCompleteness(orgId)
    if (comp.overallScore < 55) {
      signals.push({
        type: "STRUCTURE",
        severity: "INFO",
        title: "Org Health setup incomplete",
        description: `Data completeness is ${comp.overallScore}/100. Complete setup to unlock accurate capacity, ownership, and management signals.`,
        href: "/org/health/setup",
      })
    }
  } catch {
    // ignore
  }

  // Data Quality signals
  try {
    const dq = await getDataQualityDeepDive(orgId)

    // Stale availability signals: one per person (top 10)
    const staleSec = dq.sections.find((s) => s.title.startsWith("Stale availability"))
    for (const r of (staleSec?.rows ?? []).slice(0, 10)) {
      signals.push({
        type: "DATA_QUALITY",
        severity: "WARNING",
        title: "Stale availability",
        description: "Availability is stale; refresh to keep capacity signals accurate.",
        contextType: "PERSON",
        contextId: r.id,
        contextLabel: r.name,
        href: "/org/health/data-quality",
      })
    }

    // Manager conflicts: one per person (top 10)
    const confSec = dq.sections.find((s) => s.title.startsWith("Conflicting manager"))
    for (const r of (confSec?.rows ?? []).slice(0, 10)) {
      signals.push({
        type: "DATA_QUALITY",
        severity: "WARNING",
        title: "Manager link conflict",
        description: "Person has multiple managers. Resolve to improve management and structure accuracy.",
        contextType: "PERSON",
        contextId: r.id,
        contextLabel: r.name,
        href: "/org/health/data-quality",
      })
    }

    // Over-allocation: one per person (top 10)
    const overSec = dq.sections.find((s) => s.title.startsWith("Over-allocated"))
    for (const r of (overSec?.rows ?? []).slice(0, 10)) {
      signals.push({
        type: "DATA_QUALITY",
        severity: "INFO",
        title: "Over-allocation",
        description: "Total allocation exceeds 110%. Consider normalizing or revisiting plan assumptions.",
        contextType: "PERSON",
        contextId: r.id,
        contextLabel: r.name,
        href: "/org/health/data-quality",
      })
    }
  } catch {
    // ignore
  }

  // Weekly freshness check
  try {
    const freshness = await getFreshnessSummary(orgId)

    if (freshness.needsAttention) {
      signals.push({
        type: "DATA_QUALITY",
        severity: freshness.staleAvailability >= 10 ? "WARNING" : "INFO",
        title: "Weekly freshness check",
        description: `${freshness.staleAvailability} people have not updated availability in the last 7 days.`,
        href: "/org/health/data-quality",
      })
    }
  } catch {
    // ignore
  }

  if (signals.length === 0) {
    signals.push({
      type: "OWNERSHIP",
      severity: "INFO",
      title: "Baseline signals active",
      description:
        "Org health is now enabled. Next steps will compute true capacity, ownership coverage, and balance metrics.",
    })
  }

  return {
    snapshot: {
      capturedAt: new Date(),
      capacityScore,
      ownershipScore,
      balanceScore,
      managementScore: typeof managementScore === "number" ? managementScore : undefined,
      phaseCVersion: PHASE_C_VERSION,
    },
    signals,
  }
}

