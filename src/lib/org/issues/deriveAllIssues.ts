/**
 * Canonical Issue Derivation Function
 *
 * Single source of truth for deriving all organizational issues.
 * Used by both /api/org/integrity and /api/org/intelligence/landing.
 *
 * Returns standardized payload with issueWindow and thresholds for UI parity.
 */

import { prisma } from "@/lib/db";
import {
  deriveOwnershipIssues,
  deriveIssues,
  deriveCapacityIssues,
  deriveSnapshotCapacityIssues,
  buildIssueExplainability,
  deriveWorkImpactIssues,
  type OrgIssueMetadata,
  type CapacityIssueContext,
  type SnapshotIssueContext,
} from "@/lib/org/deriveIssues";
import { resolveTeamOwners, resolveDepartmentOwners } from "@/lib/org/ownership-resolver";
import { batchIsPersonManagerExempt } from "@/lib/org/manager-exemption";
import {
  getDefaultIssueWindow,
  getWorkspaceThresholdsAsync,
  type CapacityThresholdsWithWindow,
} from "@/lib/org/capacity/thresholds";
import {
  getCapacityContractsBatch,
  resolveActiveContractBatch,
  computeEffectiveCapacity,
  computeWeeklySnapshotBatch,
  type EffectiveCapacity,
} from "@/lib/org/capacity";
import { getWorkAllocationsBatch } from "@/lib/org/allocations";
import { getAvailabilityEventsBatch } from "@/lib/org/availability";
import type { SerializedIssueWindow, IssueWindowLabel } from "@/lib/org/intelligence/types";
import { resolveWorkImpactSummary } from "@/lib/org/impact/resolveWorkImpact";
import { deriveDecisionIssues } from "@/lib/org/issues/deriveDecisionIssues";
import { deriveResponsibilityIssues } from "@/lib/org/issues/deriveResponsibilityIssues";
import { deriveWorkStaffingIssues } from "@/lib/org/issues/deriveWorkStaffingIssues";

// ============================================================================
// Helper Functions
// ============================================================================

function getIssueExplanation(issueType: string): string {
  const explanations: Record<string, string> = {
    MISSING_MANAGER: "Person is missing a manager assignment",
    MISSING_TEAM: "Person is missing a team assignment",
    MISSING_ROLE: "Person is missing a role/title",
    UNOWNED_TEAM: "Team has no assigned owner",
    UNOWNED_DEPARTMENT: "Department has no assigned owner",
    UNASSIGNED_TEAM: "Team is not assigned to a department",
    EMPTY_DEPARTMENT: "Department has no teams",
    OWNERSHIP_CONFLICT: "Conflicting ownership sources detected",
    ORPHAN_ENTITY: "Entity is not properly connected",
    CYCLE_DETECTED: "Circular reporting chain detected",
  };
  return explanations[issueType] || `${issueType} issue detected`;
}

function getFixAction(issueType: string): string {
  const actions: Record<string, string> = {
    MISSING_MANAGER: "Assign manager",
    MISSING_TEAM: "Assign team",
    MISSING_ROLE: "Assign role",
    UNOWNED_TEAM: "Assign team owner",
    UNOWNED_DEPARTMENT: "Assign department owner",
    UNASSIGNED_TEAM: "Assign to department",
    EMPTY_DEPARTMENT: "Add team to department",
    OWNERSHIP_CONFLICT: "Resolve ownership conflict",
    ORPHAN_ENTITY: "Fix entity connection",
    CYCLE_DETECTED: "Fix reporting cycle",
  };
  return actions[issueType] || "Fix issue";
}

function getFocusForIssue(issueType: string): string {
  const focusMap: Record<string, string> = {
    MISSING_MANAGER: "manager",
    MISSING_TEAM: "team",
    MISSING_ROLE: "role",
  };
  return focusMap[issueType] || "";
}

// ============================================================================
// Main Function
// ============================================================================

export async function deriveAllIssues(
  workspaceId: string,
  opts?: { timeWindow?: { start: Date; end: Date } }
): Promise<{
  issues: OrgIssueMetadata[];
  issueWindow: SerializedIssueWindow;
  thresholds: CapacityThresholdsWithWindow;
}> {
  // 1. Determine issue window
  const isCustomWindow = !!opts?.timeWindow;
  const window = opts?.timeWindow ?? getDefaultIssueWindow();
  const label: IssueWindowLabel = isCustomWindow ? "Custom range" : "Next 7 days";

  const issueWindow: SerializedIssueWindow = {
    start: window.start.toISOString(),
    end: window.end.toISOString(),
    label,
  };

  // 2. Get thresholds (DB-backed with defaults fallback)
  const thresholds = await getWorkspaceThresholdsAsync(workspaceId);

  // 3. Fetch workspace slug and teams/departments
  if (!prisma) {
    throw new Error("Prisma client not initialized");
  }
  
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true }
  });
  const workspaceSlug = workspace?.slug || workspaceId;
  
  const [teams, departments] = await Promise.all([
    prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true, departmentId: true },
    }),
    prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true, name: { not: { equals: "Unassigned" } } },
      select: { id: true, name: true },
    }),
  ]);

  // 4. Use batch resolvers for ownership
  const teamIds = teams.map((t) => t.id);
  const deptIds = departments.map((d) => d.id);
  const [teamResolutions, deptResolutions] = await Promise.all([
    resolveTeamOwners(workspaceId, teamIds),
    resolveDepartmentOwners(workspaceId, deptIds),
  ]);

  // 5. Derive ownership issues
  const teamInputs = teams.map((t) => ({
    id: t.id,
    name: t.name,
    departmentId: t.departmentId,
    departmentName: departments.find((d) => d.id === t.departmentId)?.name || null,
  }));

  const deptInputs = departments.map((d) => ({
    id: d.id,
    name: d.name,
    teamIds: teams.filter((t) => t.departmentId === d.id).map((t) => t.id),
  }));

  const ownershipIssues = deriveOwnershipIssues(
    workspaceSlug,
    teamInputs,
    deptInputs,
    teamResolutions,
    deptResolutions
  );

  // 6. Derive person issues with exemption check
  const positions = await prisma!.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: { not: null },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      parent: { select: { userId: true } },
      team: { select: { id: true, name: true, departmentId: true } },
    },
  });

  const userIds = positions.map((p) => p.userId!).filter(Boolean);
  const [exemptions, contractsByPerson, allocationsByPerson, availabilityByPerson] = await Promise.all([
    batchIsPersonManagerExempt(userIds, workspaceId),
    getCapacityContractsBatch(workspaceId, userIds),
    getWorkAllocationsBatch(workspaceId, userIds, window),
    getAvailabilityEventsBatch(workspaceId, userIds, window),
  ]);

  const personInputs = positions.map((p) => ({
    id: p.userId!,
    managerId: p.parent?.userId || null,
    teamId: p.team?.id || null,
    team: p.team?.name || null,
    title: p.title || null,
    role: p.title || null,
    isRootOrExec: exemptions.get(p.userId!) || false,
  }));

  const personIssuesResults = deriveIssues(personInputs);

  // 7. Convert person issues to OrgIssueMetadata format
  const personIssues: OrgIssueMetadata[] = personIssuesResults.flatMap((pi) =>
    pi.issues.map((issueType) => {
      const pos = positions.find((p) => p.userId === pi.personId);
      const name = pos?.user?.name || pos?.user?.email || "Unknown";
      const issueKey = `${issueType}:PERSON:${pi.personId}`;
      const fixUrl = `/org/people/${pi.personId}?focus=${getFocusForIssue(issueType)}`;
      const fixAction = getFixAction(issueType);
      return {
        issueKey,
        issueId: issueKey,
        type: issueType,
        severity: issueType === "CYCLE_DETECTED" ? ("error" as const) : ("warning" as const),
        entityType: "PERSON" as const,
        entityId: pi.personId,
        entityName: name,
        explanation: getIssueExplanation(issueType),
        fixUrl,
        fixAction,
        explainability: buildIssueExplainability(
          { type: issueType, entityType: "PERSON", entityId: pi.personId, issueKey },
          { fixUrl, fixAction, entityName: name }
        ),
      };
    })
  );

  // 8. Derive work impact issues (WORK_IMPACT_UNDEFINED)
  // Fetch open work requests
  const openWorkRequests = await prisma!.workRequest.findMany({
    where: { workspaceId, status: "OPEN" },
    select: { id: true, title: true, priority: true, status: true },
  });

  // Batch resolve impact summaries (summary-only path to avoid unnecessary hydration)
  const impactSummaryResults = await Promise.all(
    openWorkRequests.map(async (wr) => {
      // Fetch full work request for resolveWorkImpactSummary
      const fullWorkRequest = await prisma!.workRequest.findUnique({
        where: { id: wr.id },
      });
      if (!fullWorkRequest) return null;
      const result = await resolveWorkImpactSummary(workspaceId, fullWorkRequest, { includeInferred: true });
      return {
        workRequestId: result.workRequestId,
        summary: result.summary,
      };
    })
  );
  
  // Filter out nulls
  const validResults = impactSummaryResults.filter((r): r is NonNullable<typeof r> => r !== null);

  // Build map: workRequestId -> WorkImpactSummary
  const impactSummaryMap = new Map(
    validResults.map((r) => [r.workRequestId, r.summary])
  );

  // Derive work impact issues
  const workImpactIssues = await deriveWorkImpactIssues(
    workspaceId,
    openWorkRequests,
    impactSummaryMap
  );

  // 9. Derive decision authority issues (Phase I)
  let decisionIssues: OrgIssueMetadata[] = [];
  try {
    decisionIssues = await deriveDecisionIssues(workspaceId, window);
  } catch (err: unknown) {
    console.warn("[deriveAllIssues] Decision issue derivation failed:", err);
  }

  // 10. Derive responsibility issues (Phase K)
  let responsibilityIssues: OrgIssueMetadata[] = [];
  try {
    responsibilityIssues = await deriveResponsibilityIssues(workspaceId);
  } catch (err: unknown) {
    console.warn("[deriveAllIssues] Responsibility issue derivation failed:", err);
  }

  // 11. Derive work staffing issues (Phase H)
  let workStaffingIssues: OrgIssueMetadata[] = [];
  try {
    workStaffingIssues = await deriveWorkStaffingIssues(workspaceId);
  } catch (err: unknown) {
    console.warn("[deriveAllIssues] Work staffing issue derivation failed:", err);
  }

  // 12. Derive capacity issues (OVERALLOCATED_PERSON, UNAVAILABLE_OWNER, LOW_EFFECTIVE_CAPACITY, etc.)
  let capacityIssues: OrgIssueMetadata[] = [];
  try {
    const effectiveCapacities = new Map<string, EffectiveCapacity>();
    for (const personId of userIds) {
      effectiveCapacities.set(personId, computeEffectiveCapacity(personId, window, {
        availabilityEvents: availabilityByPerson.get(personId) ?? [],
        capacityContracts: contractsByPerson.get(personId) ?? [],
        workAllocations: allocationsByPerson.get(personId) ?? [],
      }));
    }

    const contractResolutions = resolveActiveContractBatch(contractsByPerson, window.start);

    const capacityPersonMetadata = new Map(
      positions.map((p) => [p.userId!, { name: p.user?.name ?? p.user?.email ?? p.userId! }])
    );

    const capacityContext: CapacityIssueContext = {
      timeWindow: window,
      workspaceSlug,
      effectiveCapacities,
      contractResolutions,
      teamOwnershipResolutions: teamResolutions,
      deptOwnershipResolutions: deptResolutions,
      personMetadata: capacityPersonMetadata,
      workAllocations: allocationsByPerson,
      availabilityEvents: availabilityByPerson,
      thresholds: {
        lowCapacityHoursThreshold: thresholds.lowCapacityHoursThreshold,
        overallocationThreshold: thresholds.overallocationThreshold,
        minCapacityForCoverage: thresholds.minCapacityForCoverage,
      },
    };

    capacityIssues = deriveCapacityIssues(capacityContext);
  } catch (err: unknown) {
    console.warn("[deriveAllIssues] Capacity issue derivation failed:", err);
  }

  // 13. Derive snapshot-based capacity issues (capacity calc contract v1.0 §9.2)
  let snapshotCapacityIssues: OrgIssueMetadata[] = [];
  try {
    const now = new Date();
    const { startOfWeek, addWeeks } = await import("date-fns");
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const nextWeekStart = addWeeks(currentWeekStart, 1);

    const [currentWeekSnapshots, nextWeekSnapshots] = await Promise.all([
      computeWeeklySnapshotBatch(workspaceId, currentWeekStart),
      computeWeeklySnapshotBatch(workspaceId, nextWeekStart),
    ]);

    // Build person-to-team mapping from positions
    const personTeams = new Map<string, { teamId: string; teamName: string }>();
    for (const pos of positions) {
      if (pos.userId && pos.team) {
        personTeams.set(pos.userId, { teamId: pos.team.id, teamName: pos.team.name });
      }
    }

    const snapshotPersonMetadata = new Map(
      positions.map((p) => [p.userId!, { name: p.user?.name ?? p.user?.email ?? p.userId! }])
    );

    const snapshotContext: SnapshotIssueContext = {
      workspaceSlug,
      currentWeekSnapshots,
      nextWeekSnapshots,
      personMetadata: snapshotPersonMetadata,
      personTeams,
      thresholds: {
        overallocationThreshold: thresholds.overallocationThreshold * 100,
        thresholdAtRisk: thresholds.thresholdAtRisk * 100,
        underutilizedThresholdPct: thresholds.underutilizedThresholdPct * 100,
      },
    };

    snapshotCapacityIssues = deriveSnapshotCapacityIssues(snapshotContext);
  } catch (err: unknown) {
    console.warn("[deriveAllIssues] Snapshot capacity issue derivation failed:", err);
  }

  // 14. Combine all derived issues
  const allIssues: OrgIssueMetadata[] = [
    ...ownershipIssues,
    ...personIssues,
    ...workImpactIssues,
    ...decisionIssues,
    ...responsibilityIssues,
    ...workStaffingIssues,
    ...capacityIssues,
    ...snapshotCapacityIssues,
  ];

  // Return standardized payload
  return {
    issues: allIssues,
    issueWindow,
    thresholds,
  };
}
