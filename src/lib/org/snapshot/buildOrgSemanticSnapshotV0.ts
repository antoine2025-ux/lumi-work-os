/**
 * Org Semantic Snapshot v0 Builder
 *
 * Aggregates canonical pipelines into one stable machine-readable schema.
 * No side effects, no writes.
 */

import { prisma } from "@/lib/db";
import { getWorkspacePeopleDirectory } from "@/lib/org/people/getWorkspacePeopleDirectory";
import { listOrgIssues } from "@/lib/org/issues/listOrgIssues";
import { sortIssuesForSnapshot } from "@/lib/org/issues/sortIssues";
import { computeSummaries } from "@/lib/org/intelligence/computeSummaries";
import { resolveTeamOwners, resolveDepartmentOwners } from "@/lib/org/ownership-resolver";
import {
  type OrgSemanticSnapshotV0,
  type OrgReadinessBlocker,
  type OrgCoverageMetric,
  type OrgOwnershipCoverage,
  type RoleSemanticSummary,
  type DecisionDomainSemanticSummary,
  type CapacitySemanticSummary,
  type ResponsibilitySemanticSummary,
  type WorkSemanticSummary,
  type IssueSemanticSummary,
} from "./types";
import { BLOCKER_PRIORITY_V0 } from "@/lib/loopbrain/contract/blockerPriority.v0";

const CAPACITY_COVERAGE_MIN_PCT = 50;
const RESPONSIBILITY_COVERAGE_MIN_PCT = 50;

export async function buildOrgSemanticSnapshotV0(params: {
  workspaceId: string;
}): Promise<OrgSemanticSnapshotV0> {
  const { workspaceId } = params;
  const generatedAt = new Date().toISOString();

  const [
    peopleDirectory,
    issues,
    teams,
    departments,
    decisionDomains,
    responsibilityProfiles,
    workRequests,
    capacityContractsByPerson,
    personAvailabilityByPerson,
    roleTypeCounts,
    provisionalCount,
    totalWorkRequestCount,
  ] = await Promise.all([
    getWorkspacePeopleDirectory(workspaceId),
    listOrgIssues(workspaceId),
    prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true },
    }),
    prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true, name: { not: { equals: "Unassigned" } } },
      select: { id: true },
    }),
    prisma.decisionDomain.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        authority: {
          include: {
            escalationSteps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    }),
    prisma.roleResponsibilityProfile.findMany({
      where: { workspaceId },
      select: { roleType: true },
    }),
    prisma.workRequest.findMany({
      where: { workspaceId, status: "OPEN", isProvisional: false },
      include: {
        recommendationLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { recommendationAction: true, acknowledgedAt: true },
        },
      },
    }),
    prisma.capacityContract.groupBy({
      by: ["personId"],
      where: { workspaceId },
      _count: { personId: true },
    }),
    prisma.personAvailability.groupBy({
      by: ["personId"],
      where: { workspaceId },
      _count: { personId: true },
    }),
    prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        title: { not: null },
        user: {
          workspaceMemberships: {
            some: {
              workspaceId,
              employmentStatus: { not: "TERMINATED" },
            },
          },
        },
      },
      select: { title: true },
    }),
    prisma.workRequest.count({
      where: { workspaceId, status: "OPEN", isProvisional: true },
    }),
    prisma.workRequest.count({ where: { workspaceId } }),
  ]);

  const summaries = computeSummaries(issues);
  const sortedIssues = sortIssuesForSnapshot(issues);

  // --- Ownership coverage ---
  const teamIds = teams.map((t) => t.id);
  const deptIds = departments.map((d) => d.id);
  const [teamResolutions, deptResolutions] = await Promise.all([
    resolveTeamOwners(workspaceId, teamIds),
    resolveDepartmentOwners(workspaceId, deptIds),
  ]);

  const ownedTeams = Array.from(teamResolutions.values()).filter((r) => r.ownerPersonId !== null).length;
  const ownedDepartments = Array.from(deptResolutions.values()).filter((r) => r.ownerPersonId !== null).length;
  const totalTeams = teams.length;
  const totalDepartments = departments.length;
  const totalOwned = ownedTeams + ownedDepartments;
  const totalEntities = totalTeams + totalDepartments;
  const ownershipCoveragePct = totalEntities > 0 ? (totalOwned / totalEntities) * 100 : 100;

  const conflictCount =
    Array.from(teamResolutions.values()).filter((r) => r.hasConflict).length +
    Array.from(deptResolutions.values()).filter((r) => r.hasConflict).length;

  const ownership: OrgOwnershipCoverage = {
    coveragePct: Math.min(100, Math.max(0, ownershipCoveragePct)),
    conflictCount,
  };

  // --- Capacity coverage (structural: CapacityContract or PersonAvailability) ---
  const personIdsWithContract = new Set(capacityContractsByPerson.map((g) => g.personId));
  const personIdsWithAvailability = new Set(personAvailabilityByPerson.map((g) => g.personId));
  const configuredPersonIds = peopleDirectory.filter(
    (p) => personIdsWithContract.has(p.personId) || personIdsWithAvailability.has(p.personId)
  ).length;
  const totalPeople = peopleDirectory.length;
  const capacityPctConfigured = totalPeople > 0 ? (configuredPersonIds / totalPeople) * 100 : 100;

  const capacitySummary: CapacitySemanticSummary = {
    configuredCount: configuredPersonIds,
    totalPeople,
    pctConfigured: Math.min(100, Math.max(0, capacityPctConfigured)),
    issueCount: summaries.capacity.total,
  };

  const capacityMetric: OrgCoverageMetric = {
    count: configuredPersonIds,
    total: totalPeople,
    pct: capacitySummary.pctConfigured,
  };

  // --- Responsibility coverage ---
  const distinctRoleTypes = new Set(roleTypeCounts.map((p) => p.title!).filter(Boolean));
  const profileRoleTypes = new Set(responsibilityProfiles.map((p) => p.roleType));
  const profileCount = profileRoleTypes.size;
  const distinctCount = distinctRoleTypes.size;
  const responsibilityPctCovered = distinctCount > 0 ? (profileCount / distinctCount) * 100 : 100;

  const responsibilitySummary: ResponsibilitySemanticSummary = {
    profileCount,
    distinctRoleTypes: distinctCount,
    pctCovered: Math.min(100, Math.max(0, responsibilityPctCovered)),
  };

  const responsibilityProfilesMetric: OrgCoverageMetric = {
    count: profileCount,
    total: distinctCount,
    pct: responsibilitySummary.pctCovered,
  };

  // --- Decision domains ---
  const activePersonIds = new Set(peopleDirectory.map((p) => p.personId));

  async function resolvePrimaryRoleTypeToPersonCount(roleType: string): Promise<number> {
    const positions = await prisma.orgPosition.count({
      where: {
        workspaceId,
        title: { contains: roleType, mode: "insensitive" },
        isActive: true,
        userId: { not: null },
        user: {
          workspaceMemberships: {
            some: {
              workspaceId,
              employmentStatus: { not: "TERMINATED" },
            },
          },
        },
      },
    });
    return positions;
  }

  const domainSummaries: DecisionDomainSemanticSummary[] = [];
  for (const domain of decisionDomains) {
    const authority = domain.authority;
    let hasPrimary = false;
    if (authority) {
      if (authority.primaryPersonId && activePersonIds.has(authority.primaryPersonId)) {
        hasPrimary = true;
      } else if (authority.primaryRoleType) {
        const count = await resolvePrimaryRoleTypeToPersonCount(authority.primaryRoleType);
        hasPrimary = count >= 1;
      }
    }
    const hasCoverage = (authority?.escalationSteps?.length ?? 0) > 0;
    domainSummaries.push({
      key: domain.key,
      name: domain.name,
      hasPrimary,
      hasCoverage,
    });
  }

  domainSummaries.sort((a, b) => a.key.localeCompare(b.key));

  const decisionDomainsMetric: OrgCoverageMetric = {
    count: domainSummaries.length,
    total: domainSummaries.length,
    pct: domainSummaries.length > 0 ? 100 : 0,
  };

  // --- Roles ---
  const roleTypeToCount = new Map<string, number>();
  for (const pos of roleTypeCounts) {
    const rt = pos.title!;
    roleTypeToCount.set(rt, (roleTypeToCount.get(rt) ?? 0) + 1);
  }

  const roles: RoleSemanticSummary[] = Array.from(roleTypeToCount.entries())
    .map(([roleType, peopleCount]) => ({
      roleType,
      peopleCount,
      hasProfile: profileRoleTypes.has(roleType),
    }))
    .sort((a, b) => a.roleType.localeCompare(b.roleType));

  // --- Work summary ---
  const byRecommendationAction: Record<string, number> = {};
  let unacknowledgedCount = 0;
  for (const wr of workRequests) {
    const latestLog = wr.recommendationLogs[0];
    const action = latestLog?.recommendationAction ?? "NOT_EVALUATED";
    byRecommendationAction[action] = (byRecommendationAction[action] ?? 0) + 1;
    if (latestLog && !latestLog.acknowledgedAt) {
      unacknowledgedCount++;
    }
  }

  const workSummary: WorkSemanticSummary = {
    openCount: workRequests.length,
    byRecommendationAction,
    unacknowledgedCount,
  };

  // --- Issues summary ---
  const countsBySeverity = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    if (issue.severity === "error") countsBySeverity.error++;
    else if (issue.severity === "warning") countsBySeverity.warning++;
    else countsBySeverity.info++;
  }

  const topIssues = sortedIssues.slice(0, 10);
  const issueSummary: IssueSemanticSummary = {
    total: issues.length,
    countsBySeverity,
    topIssueIds: topIssues.map((i) => i.issueKey),
    topIssueTypes: topIssues.map((i) => i.type),
  };

  // --- Blockers ---
  const blockers: OrgReadinessBlocker[] = [];
  if (peopleDirectory.length === 0) blockers.push("NO_ACTIVE_PEOPLE");
  if (teams.length === 0) blockers.push("NO_TEAMS");
  const ownershipSummary = summaries.ownership as unknown as {
    unownedTeams: number;
    unownedDepartments: number;
    conflicts: number;
  };
  if (
    ownershipSummary.unownedTeams > 0 ||
    ownershipSummary.unownedDepartments > 0 ||
    ownershipSummary.conflicts > 0
  ) {
    blockers.push("OWNERSHIP_INCOMPLETE");
  }
  if (decisionDomains.length === 0) blockers.push("NO_DECISION_DOMAINS");
  if (capacityPctConfigured < CAPACITY_COVERAGE_MIN_PCT) blockers.push("CAPACITY_COVERAGE_BELOW_MIN");
  if (responsibilityPctCovered < RESPONSIBILITY_COVERAGE_MIN_PCT)
    blockers.push("RESPONSIBILITY_PROFILES_MISSING");
  if (workRequests.length === 0 && (provisionalCount > 0 || totalWorkRequestCount === 0)) {
    blockers.push("WORK_CANNOT_EVALUATE_BASELINE");
  }

  // Sort blockers by fixed priority (must match BLOCKER_PRIORITY_V0 order)
  const blockerSet = new Set(blockers);
  const sortedBlockers = BLOCKER_PRIORITY_V0.filter((b) => blockerSet.has(b));

  return {
    schemaVersion: "v0",
    generatedAt,
    workspaceId,
    readiness: {
      isAnswerable: sortedBlockers.length === 0,
      blockers: sortedBlockers,
    },
    coverage: {
      ownership,
      capacity: capacityMetric,
      responsibilityProfiles: responsibilityProfilesMetric,
      decisionDomains: decisionDomainsMetric,
    },
    roles,
    decisionDomains: domainSummaries,
    capacity: capacitySummary,
    responsibility: responsibilitySummary,
    decisions: { domains: domainSummaries },
    work: workSummary,
    issues: issueSummary,
  };
}
