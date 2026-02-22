/**
 * Org Issues Derivation
 * 
 * Deterministic issue derivation from org state.
 * No storage, no mutation, no prioritization.
 * 
 * Golden Rule: Problems Are Views, Not States
 * 
 * Phase 1 Extensions:
 * - Extended issue types with intentional absence support
 * - Cycle detection for reporting chains
 * - Orphan position detection
 */

import type { OwnerResolution } from "./ownership-resolver";
import {
  deepLinkForUnassignedTeam,
  deepLinkForPersonCapacity,
  deepLinkForTeam,
  deepLinkForDepartment,
  deepLinkForTeamInStructure,
} from "./issues/deepLinks";

// Issue types - canonical, structured, queryable problems (LoopBrain-facing)
export type OrgIssue =
  | "MISSING_MANAGER"
  | "MISSING_TEAM"
  | "MISSING_ROLE"
  | "MANAGER_INTENTIONALLY_ABSENT"
  | "TEAM_INTENTIONALLY_ABSENT"
  | "ORPHAN_POSITION"
  | "CYCLE_DETECTED"
  | "OWNERSHIP_CONFLICT"
  | "UNOWNED_TEAM"
  | "UNOWNED_DEPARTMENT"
  | "UNASSIGNED_TEAM"
  | "EMPTY_DEPARTMENT"
  | "ORPHAN_ENTITY"
  // Phase G: Capacity & Availability issues
  | "CAPACITY_CONTRACT_CONFLICT"
  | "UNAVAILABLE_OWNER"
  | "OVERALLOCATED_PERSON"
  | "LOW_EFFECTIVE_CAPACITY"
  | "NO_AVAILABLE_COVER"
  | "SINGLE_POINT_OF_FAILURE"
  // Phase H: Work Intake issues
  | "WORK_NOT_STAFFABLE"
  | "WORK_CAPACITY_GAP"
  | "WORK_ROLE_MISMATCH"
  | "WORK_NO_DECISION_DOMAIN"
  // Phase I: Decision Authority issues
  | "DECISION_AUTHORITY_MISSING"
  | "DECISION_AUTHORITY_ROLE_UNRESOLVABLE"
  | "DECISION_AUTHORITY_PRIMARY_UNAVAILABLE"
  | "DECISION_DOMAIN_NO_COVERAGE"
  // Phase J: Impact & Dependency issues
  | "WORK_IMPACT_UNDEFINED"
  | "HIGH_IMPACT_SINGLE_OWNER"
  | "DECISION_DOMAIN_IMPACTED"
  // Phase K: Role Alignment issues
  | "ROLE_ALIGNMENT_UNKNOWN"
  | "WORK_ROLE_MISALIGNED"
  | "ROLE_PROFILE_MISSING"
  | "FORBIDDEN_RESPONSIBILITY_CONFLICT"
  // Capacity v1: Team-level and missing-data issues
  | "CAPACITY_MISSING_DATA_PERSON"
  | "CAPACITY_OVERLOADED_TEAM"
  | "CAPACITY_SEVERELY_OVERLOADED_TEAM"
  | "CAPACITY_UNDERUTILIZED_TEAM"
  | "CAPACITY_TEAM_NO_MEMBERS"
  // Reserved for v1.1 (registered to avoid union refactors)
  | "CAPACITY_MANAGER_OVERLOADED"
  | "CAPACITY_TEAM_DONUT";

// Extended person input type for issue derivation
export type PersonInput = {
  id: string;
  managerId?: string | null;
  team?: string | null;
  teamName?: string | null;
  teamId?: string | null;
  role?: string | null;
  title?: string | null;
  positionId?: string | null;
  // Phase 1: Intentional absence flags
  managerIntentionallyUnassigned?: boolean;
  teamIntentionallyUnassigned?: boolean;
  // Centralized exemption check result (computed via isPersonManagerExempt(userId, workspaceId))
  isRootOrExec?: boolean; // true if workspace owner or executive (level === 1)
};

// Extended issue result with metadata
export type PersonIssue = {
  type: OrgIssue;
  isIntentional: boolean;
  context?: Record<string, unknown>;
  issueKey: string; // PRIMARY IDENTIFIER: `${issueType}:PERSON:${personId}`
};

export type PersonIssues = {
  personId: string;
  issues: OrgIssue[];
  // Extended issue details with intentionality
  issueDetails: PersonIssue[];
};

/**
 * Derive issues for a list of people
 * 
 * @param people - Array of person objects with org data
 * @returns Array of PersonIssues for people with at least one issue
 */
export function deriveIssues(people: PersonInput[]): PersonIssues[] {
  return people
    .map(p => {
      const issues: OrgIssue[] = [];
      const issueDetails: PersonIssue[] = [];

      // Manager check with intentionality and exemption
      // Skip MISSING_MANAGER issue if person is exempt (workspace owner or executive)
      if (!p.managerId && !p.isRootOrExec) {
        if (p.managerIntentionallyUnassigned) {
          issues.push("MANAGER_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "MANAGER_INTENTIONALLY_ABSENT",
            isIntentional: true,
            context: { reason: "Marked as intentionally without manager" },
            issueKey: `MANAGER_INTENTIONALLY_ABSENT:PERSON:${p.id}`,
          });
        } else {
          issues.push("MISSING_MANAGER");
          issueDetails.push({
            type: "MISSING_MANAGER",
            isIntentional: false,
            issueKey: `MISSING_MANAGER:PERSON:${p.id}`,
          });
        }
      }

      // Team check with intentionality
      if (!p.team && !p.teamName && !p.teamId) {
        if (p.teamIntentionallyUnassigned) {
          issues.push("TEAM_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "TEAM_INTENTIONALLY_ABSENT",
            isIntentional: true,
            context: { reason: "Marked as intentionally without team" },
            issueKey: `TEAM_INTENTIONALLY_ABSENT:PERSON:${p.id}`,
          });
        } else {
          issues.push("MISSING_TEAM");
          issueDetails.push({
            type: "MISSING_TEAM",
            isIntentional: false,
            issueKey: `MISSING_TEAM:PERSON:${p.id}`,
          });
        }
      }

      // Role check (no intentional absence for roles - always an issue)
      if (!p.role && !p.title) {
        issues.push("MISSING_ROLE");
        issueDetails.push({
          type: "MISSING_ROLE",
          isIntentional: false,
          issueKey: `MISSING_ROLE:PERSON:${p.id}`,
        });
      }

      return {
        personId: p.id,
        issues,
        issueDetails,
      };
    })
    .filter(r => r.issues.length > 0);
}

// Position input type for position-level issues
export type PositionInput = {
  id: string;
  userId?: string | null;
  parentId?: string | null;
  teamId?: string | null;
  title?: string | null;
  managerIntentionallyUnassigned?: boolean;
  teamIntentionallyUnassigned?: boolean;
};

export type PositionIssue = {
  type: OrgIssue;
  isIntentional: boolean;
  context?: Record<string, unknown>;
  issueKey: string; // PRIMARY IDENTIFIER: `${issueType}:POSITION:${positionId}`
};

export type PositionIssues = {
  positionId: string;
  issues: OrgIssue[];
  issueDetails: PositionIssue[];
};

/**
 * Derive issues for positions (org structure)
 * 
 * @param positions - Array of position objects
 * @returns Array of PositionIssues for positions with at least one issue
 */
export function derivePositionIssues(positions: PositionInput[]): PositionIssues[] {
  return positions
    .map(pos => {
      const issues: OrgIssue[] = [];
      const issueDetails: PositionIssue[] = [];

      // Orphan position: no user assigned
      if (!pos.userId) {
        issues.push("ORPHAN_POSITION");
        issueDetails.push({
          type: "ORPHAN_POSITION",
          isIntentional: false,
          context: { positionTitle: pos.title },
          issueKey: `ORPHAN_POSITION:POSITION:${pos.id}`,
        });
      }

      // Missing team with intentionality
      if (!pos.teamId) {
        if (pos.teamIntentionallyUnassigned) {
          issues.push("TEAM_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "TEAM_INTENTIONALLY_ABSENT",
            isIntentional: true,
            issueKey: `TEAM_INTENTIONALLY_ABSENT:POSITION:${pos.id}`,
          });
        } else {
          issues.push("MISSING_TEAM");
          issueDetails.push({
            type: "MISSING_TEAM",
            isIntentional: false,
            issueKey: `MISSING_TEAM:POSITION:${pos.id}`,
          });
        }
      }

      // Missing manager with intentionality
      if (!pos.parentId) {
        if (pos.managerIntentionallyUnassigned) {
          issues.push("MANAGER_INTENTIONALLY_ABSENT");
          issueDetails.push({
            type: "MANAGER_INTENTIONALLY_ABSENT",
            isIntentional: true,
            issueKey: `MANAGER_INTENTIONALLY_ABSENT:POSITION:${pos.id}`,
          });
        } else {
          issues.push("MISSING_MANAGER");
          issueDetails.push({
            type: "MISSING_MANAGER",
            isIntentional: false,
            issueKey: `MISSING_MANAGER:POSITION:${pos.id}`,
          });
        }
      }

      return {
        positionId: pos.id,
        issues,
        issueDetails,
      };
    })
    .filter(r => r.issues.length > 0);
}

/**
 * Detect cycles in the reporting chain
 * 
 * @param positions - Array of positions with parentId relationships
 * @returns Array of position IDs that are part of a cycle
 */
export function detectReportingCycles(
  positions: { id: string; parentId?: string | null }[]
): { cyclePositionIds: string[]; cycleChains: string[][] } {
  const positionMap = new Map(positions.map(p => [p.id, p]));
  const cyclePositionIds = new Set<string>();
  const cycleChains: string[][] = [];

  for (const position of positions) {
    if (cyclePositionIds.has(position.id)) continue;

    const visited = new Set<string>();
    const chain: string[] = [];
    let current: string | null | undefined = position.id;

    while (current && !visited.has(current)) {
      visited.add(current);
      chain.push(current);
      const pos = positionMap.get(current);
      current = pos?.parentId;
    }

    // If we ended up at a position we've already visited in this chain, it's a cycle
    if (current && visited.has(current)) {
      const cycleStart = chain.indexOf(current);
      const cycleChain = chain.slice(cycleStart);
      cycleChain.forEach(id => cyclePositionIds.add(id));
      cycleChains.push(cycleChain);
    }
  }

  return {
    cyclePositionIds: Array.from(cyclePositionIds),
    cycleChains,
  };
}

/**
 * Get all issues including cycle detection
 * 
 * @param positions - Array of positions
 * @returns Combined issues with cycle detection
 */
export function deriveAllPositionIssues(positions: PositionInput[]): {
  positionIssues: PositionIssues[];
  cycles: { cyclePositionIds: string[]; cycleChains: string[][] };
} {
  const positionIssues = derivePositionIssues(positions);
  const cycles = detectReportingCycles(positions);

  // Add cycle issues to affected positions
  for (const positionId of cycles.cyclePositionIds) {
    const existingIssue = positionIssues.find(pi => pi.positionId === positionId);
    if (existingIssue) {
      existingIssue.issues.push("CYCLE_DETECTED");
      existingIssue.issueDetails.push({
        type: "CYCLE_DETECTED",
        isIntentional: false,
        context: { message: "Position is part of a circular reporting chain" },
        issueKey: `CYCLE_DETECTED:POSITION:${positionId}`,
      });
    } else {
      positionIssues.push({
        positionId,
        issues: ["CYCLE_DETECTED"],
        issueDetails: [{
          type: "CYCLE_DETECTED",
          isIntentional: false,
          context: { message: "Position is part of a circular reporting chain" },
          issueKey: `CYCLE_DETECTED:POSITION:${positionId}`,
        }],
      });
    }
  }

  return { positionIssues, cycles };
}

/**
 * Utility: Check if an issue type is intentional
 */
export function isIntentionalIssue(issueType: OrgIssue): boolean {
  return issueType === "MANAGER_INTENTIONALLY_ABSENT" || 
         issueType === "TEAM_INTENTIONALLY_ABSENT";
}

/**
 * Utility: Get non-intentional issues only (for actual problems)
 */
export function filterNonIntentionalIssues(issues: PersonIssues[]): PersonIssues[] {
  return issues
    .map(pi => ({
      ...pi,
      issues: pi.issues.filter(i => !isIntentionalIssue(i)),
      issueDetails: pi.issueDetails.filter(id => !id.isIntentional),
    }))
    .filter(pi => pi.issues.length > 0);
}

/**
 * Ownership issue metadata with stable issueKey as primary identifier
 */
import type { ExplainabilityBlock, ExplainDependency } from "@/lib/org/explainability/types";

export type OrgIssueMetadata = {
  issueKey: string; // PRIMARY IDENTIFIER: `${issueType}:${entityType}:${entityId}`
  issueId: string; // Equal to issueKey for derived issues
  type: OrgIssue;
  severity: 'error' | 'warning' | 'info';
  entityType: 'TEAM' | 'DEPARTMENT' | 'PERSON' | 'POSITION' | 'ROLE_COVERAGE' | 'WORK_REQUEST' | 'DECISION_DOMAIN';
  entityId: string;
  entityName: string;
  explanation: string; // DEPRECATED: keep for backward compatibility, remove in follow-up (Phase O1.1)
  fixUrl: string;
  fixAction: string;
  /** Phase O: Structured explainability (optional during migration) */
  explainability?: ExplainabilityBlock;
  /** Phase G: Typed evidence payload for LoopBrain (versionable, stable) */
  evidence?: CapacityIssueEvidence;
};

/** Union of all capacity issue evidence types */
export type CapacityIssueEvidence =
  | OverallocatedPersonEvidence
  | CapacityContractConflictEvidence
  | UnavailableOwnerEvidence
  | NoAvailableCoverEvidence
  | SinglePointOfFailureEvidence
  | LowEffectiveCapacityEvidence
  // Capacity v1: Team-level and missing-data issues
  | CapacityMissingDataPersonEvidence
  | CapacityOverloadedTeamEvidence
  | CapacityUnderutilizedTeamEvidence
  | CapacityTeamNoMembersEvidence
  // Phase H: Work Intake issues
  | WorkNotStaffableEvidence
  | WorkCapacityGapEvidence
  | WorkRoleMismatchEvidence
  // Phase I: Decision Authority issues
  | DecisionAuthorityMissingEvidence
  | DecisionAuthorityRoleUnresolvableEvidence
  | DecisionAuthorityPrimaryUnavailableEvidence
  // Phase J: Impact & Dependency issues
  | WorkImpactUndefinedEvidence
  | HighImpactSingleOwnerEvidence
  | DecisionDomainImpactedEvidence;

// ============================================================================
// Phase G: Evidence Types (versionable, minimal, typed)
// ============================================================================

export type OverallocatedPersonEvidence = {
  evidenceVersion: 1;
  totalPercent: number;
  totalAllocatedHours: number;
  contractWeeklyHours: number;
  thresholdPercent: number;
  allocations: Array<{
    id: string;
    percent: number;
    startDate: string;
    endDate: string | null;
    contextType: string;
    contextLabel: string | null;
  }>;
};

export type CapacityContractConflictEvidence = {
  evidenceVersion: 1;
  contractIds: string[];
  overlappingRanges: Array<{ start: string; end: string | null }>;
};

export type UnavailableOwnerEvidence = {
  evidenceVersion: 1;
  entityType: 'TEAM' | 'DEPARTMENT' | 'ROLE_COVERAGE';
  entityId: string;
  ownerPersonId: string;
  windowStart: string;
  windowEnd: string;
  limitingEvent: {
    id: string;
    type: string;
    startDate: string;
    endDate: string | null;
    source: 'MANUAL' | 'INTEGRATION';
    factor: number;
  } | null;
};

export type NoAvailableCoverEvidence = {
  evidenceVersion: 1;
  roleType: string;
  primaryPersonId: string;
  evaluatedSecondaryIds: string[];
  viableSecondaryIds: string[];
  minCapacityThreshold: number;
};

export type SinglePointOfFailureEvidence = {
  evidenceVersion: 1;
  roleType: string;
  primaryPersonId: string;
  secondaryCount: 0;
};

export type LowEffectiveCapacityEvidence = {
  evidenceVersion: 1;
  effectiveAvailableHours: number;
  thresholdHours: number;
  windowStart: string;
  windowEnd: string;
};

// ============================================================================
// Capacity v1: Team-Level & Missing-Data Evidence Types
// ============================================================================

export type CapacityMissingDataPersonEvidence = {
  evidenceVersion: 1;
  hasContract: boolean;
  hasAvailability: boolean;
  defaultWeeklyHoursUsed: number;
  semanticsVersion: number;
};

export type CapacityOverloadedTeamEvidence = {
  evidenceVersion: 1;
  teamId: string;
  teamName: string;
  memberCount: number;
  availableHours: number;
  allocatedHours: number;
  utilizationPct: number;
  thresholdPct: number;
  /** true when utilizationPct >= severeOverloadThresholdPct */
  isSevere: boolean;
  windowStart: string;
  windowEnd: string;
  semanticsVersion: number;
};

export type CapacityUnderutilizedTeamEvidence = {
  evidenceVersion: 1;
  teamId: string;
  teamName: string;
  memberCount: number;
  availableHours: number;
  allocatedHours: number;
  utilizationPct: number;
  thresholdPct: number;
  windowStart: string;
  windowEnd: string;
  semanticsVersion: number;
};

export type CapacityTeamNoMembersEvidence = {
  evidenceVersion: 1;
  teamId: string;
  teamName: string;
  departmentId: string | null;
  semanticsVersion: number;
};

// ============================================================================
// Phase H: Work Issue Evidence Types
// ============================================================================

export type WorkNotStaffableEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  workRequestTitle: string;
  estimatedEffortHours: number;
  viableCount: number;
  candidateCount: number;
  windowStart: string;
  windowEnd: string;
  thresholdsUsed: {
    minCapacityForWork: number;
    overallocationThreshold: number;
  };
  semanticsVersion: number;
};

export type WorkCapacityGapEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  workRequestTitle: string;
  estimatedEffortHours: number;
  capacityGapHours: number;
  totalViableCapacity: number;
  windowStart: string;
  windowEnd: string;
  thresholdsUsed: {
    minCapacityForWork: number;
    overallocationThreshold: number;
  };
  semanticsVersion: number;
};

export type WorkRoleMismatchEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  workRequestTitle: string;
  requiredRoleType: string;
  requiredSeniority: string | null;
  candidateCount: number;
  matchingRoleCount: number;
  windowStart: string;
  windowEnd: string;
  thresholdsUsed: {
    minCapacityForWork: number;
    overallocationThreshold: number;
  };
  semanticsVersion: number;
};

// ============================================================================
// Phase I: Decision Authority Evidence Types
// ============================================================================

export type DecisionAuthorityMissingEvidence = {
  evidenceVersion: 1;
  domainKey: string;
  domainName: string;
  semanticsVersion: number;
};

export type DecisionAuthorityRoleUnresolvableEvidence = {
  evidenceVersion: 1;
  domainKey: string;
  roleType: string;
  configuredFor: "PRIMARY" | "ESCALATION";
  stepOrder: number | null;
  semanticsVersion: number;
};

export type DecisionAuthorityPrimaryUnavailableEvidence = {
  evidenceVersion: 1;
  domainKey: string;
  primaryPersonId: string;
  windowStart: string;
  windowEnd: string;
  availabilityFactor: number;
  semanticsVersion: number;
};

// ============================================================================
// Phase J: Impact & Dependency Evidence Types
// ============================================================================

export type WorkImpactUndefinedEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  workRequestTitle: string;
  inferredCount: number;
  semanticsVersion: number;
};

export type HighImpactSingleOwnerEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  impactedEntityType: string;
  impactedEntityId: string;
  ownerPersonId: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  semanticsVersion: number;
};

export type DecisionDomainImpactedEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  domainKey: string;
  hasEscalation: boolean;
  semanticsVersion: number;
};

// ============================================================================
// Phase K: Role Alignment Evidence Types
// ============================================================================

export type RoleAlignmentUnknownEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  reason: "NO_WORK_TAGS" | "NO_PROFILE";
  roleType: string | null;
  semanticsVersion: number;
};

export type WorkRoleMisalignedEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  personId: string;
  roleType: string;
  workTags: string[];
  matchedTags: string[];
  missingTags: string[];
  semanticsVersion: number;
};

export type RoleProfileMissingEvidence = {
  evidenceVersion: 1;
  workspaceId: string;
  roleType: string;
  affectedPersonCount: number;
  semanticsVersion: number;
};

export type ForbiddenResponsibilityConflictEvidence = {
  evidenceVersion: 1;
  workRequestId: string;
  personId: string;
  forbiddenTag: string;
  roleType: string;
  semanticsVersion: number;
};

/**
 * Team input type for ownership issue derivation
 */
export type TeamInput = {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName?: string | null;
};

/**
 * Department input type for ownership issue derivation
 */
export type DepartmentInput = {
  id: string;
  name: string;
  teamIds?: string[];
};

// ============================================================================
// Helper: Build Issue Explainability
// ============================================================================

/**
 * Build structured explainability for an issue from actual evidence and context.
 * Uses real data, not centralized templates.
 * 
 * @param issue - Issue data (type, entityType, entityId, issueKey)
 * @param context - Context data (fixUrl, fixAction, evidence, etc.)
 * @returns ExplainabilityBlock
 */
export function buildIssueExplainability(
  issue: { type: OrgIssue; entityType: string; entityId: string; issueKey: string },
  context: { fixUrl?: string; fixAction?: string; evidence?: Record<string, unknown>; entityName?: string }
): ExplainabilityBlock {
  const dependsOn: ExplainDependency[] = [
    { type: "DATA", label: `${issue.entityType} data`, reference: issue.entityId },
  ];

  // Add evidence-specific dependencies if available
  if (context.evidence) {
    if (context.evidence.personId) {
      dependsOn.push({ type: "DATA", label: "Person data", reference: String(context.evidence.personId) });
    }
    if (context.evidence.teamId) {
      dependsOn.push({ type: "DATA", label: "Team data", reference: String(context.evidence.teamId) });
    }
    if (context.evidence.departmentId) {
      dependsOn.push({ type: "DATA", label: "Department data", reference: String(context.evidence.departmentId) });
    }
    if (context.evidence.workRequestId) {
      dependsOn.push({ type: "DATA", label: "Work request data", reference: String(context.evidence.workRequestId) });
      dependsOn.push({ type: "DATA", label: "Impact resolution", reference: String(context.evidence.workRequestId) });
    }
  }

  // Build why array from issue type
  const why: string[] = [];
  switch (issue.type) {
    case "OWNERSHIP_CONFLICT":
      why.push(`${issue.entityType} has conflicting ownership sources: ownerAssignment and ownerPersonId differ`);
      break;
    case "UNOWNED_TEAM":
      why.push(`Team "${context.entityName || issue.entityId}" has no assigned owner`);
      break;
    case "UNOWNED_DEPARTMENT":
      why.push(`Department "${context.entityName || issue.entityId}" has no assigned owner`);
      break;
    case "UNASSIGNED_TEAM":
      why.push(`Team "${context.entityName || issue.entityId}" is not assigned to a department`);
      break;
    case "EMPTY_DEPARTMENT":
      why.push(`Department "${context.entityName || issue.entityId}" has no teams`);
      break;
    case "MISSING_MANAGER":
      why.push(`Person "${context.entityName || issue.entityId}" has no manager assignment`);
      break;
    case "MISSING_TEAM":
      why.push(`Person "${context.entityName || issue.entityId}" has no team assignment`);
      break;
    case "MISSING_ROLE":
      why.push(`Person "${context.entityName || issue.entityId}" has no role/title`);
      break;
    case "CYCLE_DETECTED":
      why.push(`Circular reporting chain detected for person "${context.entityName || issue.entityId}"`);
      break;
    case "CAPACITY_CONTRACT_CONFLICT":
      why.push(`Person "${context.entityName || issue.entityId}" has overlapping capacity contracts`);
      break;
    case "OVERALLOCATED_PERSON":
      why.push(`Person "${context.entityName || issue.entityId}" is overallocated`);
      break;
    case "LOW_EFFECTIVE_CAPACITY":
      why.push(`Person "${context.entityName || issue.entityId}" has low available capacity`);
      break;
    case "UNAVAILABLE_OWNER":
      why.push(`Owner "${context.entityName || issue.entityId}" is unavailable in the time window`);
      break;
    case "NO_AVAILABLE_COVER":
      why.push(`No backup personnel available with sufficient capacity`);
      break;
    case "SINGLE_POINT_OF_FAILURE":
      why.push(`No backup personnel defined`);
      break;
    case "WORK_IMPACT_UNDEFINED":
      if (context.evidence?.workRequestId) {
        const inferredCount = Number(context.evidence.inferredCount) || 0;
        const inferredText = inferredCount > 0
          ? ` (${inferredCount} inferred impact(s) found, but no explicit impacts defined)`
          : " (no explicit or inferred impacts defined)";
        why.push(`Work request "${context.entityName || issue.entityId}" has no explicit impacts defined${inferredText}`);
      } else {
        why.push(`Work request "${context.entityName || issue.entityId}" has no explicit impacts defined`);
      }
      break;
    // Capacity v1 issue types
    case "CAPACITY_MISSING_DATA_PERSON":
      why.push(`Person "${context.entityName || issue.entityId}" has no capacity data configured (no contract, no availability records)`);
      break;
    case "CAPACITY_OVERLOADED_TEAM":
      why.push(`Team "${context.entityName || issue.entityId}" is overloaded based on aggregate member utilization`);
      break;
    case "CAPACITY_SEVERELY_OVERLOADED_TEAM":
      why.push(`Team "${context.entityName || issue.entityId}" is severely overloaded based on aggregate member utilization`);
      break;
    case "CAPACITY_UNDERUTILIZED_TEAM":
      why.push(`Team "${context.entityName || issue.entityId}" is underutilized based on aggregate member utilization`);
      break;
    case "CAPACITY_TEAM_NO_MEMBERS":
      why.push(`Team "${context.entityName || issue.entityId}" has no active members assigned`);
      break;
    default:
      why.push(`${issue.type} issue detected for ${issue.entityType} "${context.entityName || issue.entityId}"`);
  }

  // Build whatChangesIt from fixAction
  const whatChangesIt: string[] = [];
  if (context.fixAction) {
    whatChangesIt.push(context.fixAction);
  } else {
    // Generic fallback based on issue type
    switch (issue.type) {
      case "OWNERSHIP_CONFLICT":
        whatChangesIt.push("Resolve ownership conflict");
        break;
      case "UNOWNED_TEAM":
      case "UNOWNED_DEPARTMENT":
        whatChangesIt.push("Assign owner");
        break;
      case "UNASSIGNED_TEAM":
        whatChangesIt.push("Assign team to department");
        break;
      case "MISSING_MANAGER":
        whatChangesIt.push("Assign manager");
        break;
      case "MISSING_TEAM":
        whatChangesIt.push("Assign team");
        break;
      case "MISSING_ROLE":
        whatChangesIt.push("Assign role");
        break;
      case "CYCLE_DETECTED":
        whatChangesIt.push("Fix reporting cycle");
        break;
      case "CAPACITY_CONTRACT_CONFLICT":
        whatChangesIt.push("Resolve contract conflict");
        break;
      case "OVERALLOCATED_PERSON":
        whatChangesIt.push("Reduce allocation");
        break;
      case "LOW_EFFECTIVE_CAPACITY":
        whatChangesIt.push("Review capacity");
        break;
      case "UNAVAILABLE_OWNER":
        whatChangesIt.push("Assign backup owner");
        break;
      case "NO_AVAILABLE_COVER":
        whatChangesIt.push("Resolve coverage gap");
        break;
      case "SINGLE_POINT_OF_FAILURE":
        whatChangesIt.push("Add backup personnel");
        break;
      case "WORK_IMPACT_UNDEFINED":
        whatChangesIt.push("Add explicit impacts");
        break;
      // Capacity v1 issue types
      case "CAPACITY_MISSING_DATA_PERSON":
        whatChangesIt.push("Set capacity data");
        break;
      case "CAPACITY_OVERLOADED_TEAM":
      case "CAPACITY_SEVERELY_OVERLOADED_TEAM":
        whatChangesIt.push("Review team capacity");
        break;
      case "CAPACITY_UNDERUTILIZED_TEAM":
        whatChangesIt.push("Review team allocation");
        break;
      case "CAPACITY_TEAM_NO_MEMBERS":
        whatChangesIt.push("Assign team members");
        break;
      default:
        whatChangesIt.push("Fix issue");
    }
  }

  return {
    blockId: issue.issueKey, // For issues: blockId = issueKey
    kind: "ISSUE",
    why,
    dependsOn,
    whatChangesIt,
  };
}

/**
 * Derive ownership-related issues for teams and departments
 * Uses ownership resolver results (hasConflict flags) to derive issues
 * 
 * @param teams - Array of team objects
 * @param departments - Array of department objects
 * @param teamResolutions - Map of team ownership resolutions from resolver
 * @param deptResolutions - Map of department ownership resolutions from resolver
 * @returns Array of OrgIssueMetadata for ownership-related issues
 */
export function deriveOwnershipIssues(
  workspaceSlug: string,
  teams: TeamInput[],
  departments: DepartmentInput[],
  teamResolutions: Map<string, OwnerResolution>,
  deptResolutions: Map<string, OwnerResolution>
): OrgIssueMetadata[] {
  const issues: OrgIssueMetadata[] = [];

  // Derive OWNERSHIP_CONFLICT issues for teams
  for (const team of teams) {
    const resolution = teamResolutions.get(team.id);
    if (resolution?.hasConflict) {
      const issueKey = `OWNERSHIP_CONFLICT:TEAM:${team.id}`;
      issues.push({
        issueKey,
        issueId: issueKey, // For derived issues, issueId === issueKey
        type: 'OWNERSHIP_CONFLICT',
        severity: 'error',
        entityType: 'TEAM',
        entityId: team.id,
        entityName: team.name,
        explanation: 'Team has conflicting ownership sources: ownerAssignment and ownerPersonId differ. This needs resolution to ensure consistent ownership.',
        fixUrl: deepLinkForTeam(workspaceSlug, team.id),
        fixAction: 'Resolve ownership conflict',
        explainability: buildIssueExplainability(
          { type: 'OWNERSHIP_CONFLICT', entityType: 'TEAM', entityId: team.id, issueKey },
          { fixUrl: deepLinkForTeam(workspaceSlug, team.id), fixAction: 'Resolve ownership conflict', entityName: team.name }
        ),
      });
    }
  }

  // Derive OWNERSHIP_CONFLICT issues for departments
  for (const dept of departments) {
    const resolution = deptResolutions.get(dept.id);
    if (resolution?.hasConflict) {
      const issueKey = `OWNERSHIP_CONFLICT:DEPARTMENT:${dept.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'OWNERSHIP_CONFLICT',
        severity: 'error',
        entityType: 'DEPARTMENT',
        entityId: dept.id,
        entityName: dept.name,
        explanation: 'Department has conflicting ownership sources: ownerAssignment and ownerPersonId differ. This needs resolution to ensure consistent ownership.',
        fixUrl: deepLinkForDepartment(workspaceSlug, dept.id),
        fixAction: 'Resolve ownership conflict',
        explainability: buildIssueExplainability(
          { type: 'OWNERSHIP_CONFLICT', entityType: 'DEPARTMENT', entityId: dept.id, issueKey },
          { fixUrl: deepLinkForDepartment(workspaceSlug, dept.id), fixAction: 'Resolve ownership conflict', entityName: dept.name }
        ),
      });
    }
  }

  // Derive UNOWNED_TEAM issues (exclude unassigned teams - departmentId: null)
  for (const team of teams) {
    if (team.departmentId === null) continue; // Exclude unassigned teams
    
    const resolution = teamResolutions.get(team.id);
    if (!resolution?.ownerPersonId) {
      const issueKey = `UNOWNED_TEAM:TEAM:${team.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'UNOWNED_TEAM',
        severity: 'warning',
        entityType: 'TEAM',
        entityId: team.id,
        entityName: team.name,
        explanation: `Team "${team.name}" has no assigned owner. Assign an owner to ensure accountability.`,
        fixUrl: deepLinkForTeam(workspaceSlug, team.id),
        fixAction: 'Assign team owner',
        explainability: buildIssueExplainability(
          { type: 'UNOWNED_TEAM', entityType: 'TEAM', entityId: team.id, issueKey },
          { fixUrl: deepLinkForTeam(workspaceSlug, team.id), fixAction: 'Assign team owner', entityName: team.name }
        ),
      });
    }
  }

  // Derive UNOWNED_DEPARTMENT issues
  for (const dept of departments) {
    const resolution = deptResolutions.get(dept.id);
    if (!resolution?.ownerPersonId) {
      const issueKey = `UNOWNED_DEPARTMENT:DEPARTMENT:${dept.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'UNOWNED_DEPARTMENT',
        severity: 'warning',
        entityType: 'DEPARTMENT',
        entityId: dept.id,
        entityName: dept.name,
        explanation: `Department "${dept.name}" has no assigned owner. Assign an owner to ensure accountability.`,
        fixUrl: deepLinkForDepartment(workspaceSlug, dept.id),
        fixAction: 'Assign department owner',
        explainability: buildIssueExplainability(
          { type: 'UNOWNED_DEPARTMENT', entityType: 'DEPARTMENT', entityId: dept.id, issueKey },
          { fixUrl: deepLinkForDepartment(workspaceSlug, dept.id), fixAction: 'Assign department owner', entityName: dept.name }
        ),
      });
    }
  }

  // Derive UNASSIGNED_TEAM issues (teams without department)
  for (const team of teams) {
    if (team.departmentId === null) {
      const issueKey = `UNASSIGNED_TEAM:TEAM:${team.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'UNASSIGNED_TEAM',
        severity: 'info',
        entityType: 'TEAM',
        entityId: team.id,
        entityName: team.name,
        explanation: `Team "${team.name}" is not assigned to any department. Assign it to a department to organize your structure.`,
        fixUrl: deepLinkForUnassignedTeam(workspaceSlug, team.id),
        fixAction: 'Assign team to department',
        explainability: buildIssueExplainability(
          { type: 'UNASSIGNED_TEAM', entityType: 'TEAM', entityId: team.id, issueKey },
          { fixUrl: deepLinkForUnassignedTeam(workspaceSlug, team.id), fixAction: 'Assign team to department', entityName: team.name }
        ),
      });
    }
  }

  // Derive EMPTY_DEPARTMENT issues (departments with no teams)
  for (const dept of departments) {
    const teamCount = dept.teamIds?.length || 0;
    if (teamCount === 0) {
      const issueKey = `EMPTY_DEPARTMENT:DEPARTMENT:${dept.id}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'EMPTY_DEPARTMENT',
        severity: 'info',
        entityType: 'DEPARTMENT',
        entityId: dept.id,
        entityName: dept.name,
        explanation: `Department "${dept.name}" has no teams. Add teams to organize your structure.`,
        fixUrl: deepLinkForDepartment(workspaceSlug, dept.id),
        fixAction: 'Add team to department',
        explainability: buildIssueExplainability(
          { type: 'EMPTY_DEPARTMENT', entityType: 'DEPARTMENT', entityId: dept.id, issueKey },
          { fixUrl: deepLinkForDepartment(workspaceSlug, dept.id), fixAction: 'Add team to department', entityName: dept.name }
        ),
      });
    }
  }

  return issues;
}

/**
 * Derive ownership-related issues for a specific entity (scoped for post-fix verification)
 * 
 * @param workspaceId - Workspace ID (for context) - currently unused but kept for consistency
 * @param entityType - Type of entity (TEAM or DEPARTMENT)
 * @param entityId - ID of the entity
 * @returns Array of OrgIssueMetadata for the specific entity
 */
export async function deriveOwnershipIssuesForEntity(
  workspaceId: string,
  entityType: 'TEAM' | 'DEPARTMENT',
  entityId: string,
  workspaceSlug: string
): Promise<OrgIssueMetadata[]> {
  // Import resolver dynamically to avoid circular dependencies
  const { resolveOwner } = await import('./ownership-resolver');
  const { prisma } = await import('@/lib/db');

  const resolution = await resolveOwner(workspaceId, entityType, entityId);
  const issues: OrgIssueMetadata[] = [];

  // Get entity details
  const entity = entityType === 'TEAM'
    ? await prisma.orgTeam.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, departmentId: true },
      })
    : await prisma.orgDepartment.findUnique({
        where: { id: entityId },
        select: { id: true, name: true },
      });

  if (!entity) return issues;

  // OWNERSHIP_CONFLICT issue
  if (resolution.hasConflict) {
      const issueKey = `OWNERSHIP_CONFLICT:${entityType}:${entityId}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'OWNERSHIP_CONFLICT',
        severity: 'error',
        entityType,
        entityId,
        entityName: entity.name,
        explanation: `${entityType} has conflicting ownership sources: ownerAssignment and ownerPersonId differ. This needs resolution to ensure consistent ownership.`,
        fixUrl: entityType === 'TEAM' ? deepLinkForTeam(workspaceSlug, entityId) : deepLinkForDepartment(workspaceSlug, entityId),
        fixAction: 'Resolve ownership conflict',
        explainability: buildIssueExplainability(
          { type: 'OWNERSHIP_CONFLICT', entityType, entityId, issueKey },
          { fixUrl: entityType === 'TEAM' ? deepLinkForTeam(workspaceSlug, entityId) : deepLinkForDepartment(workspaceSlug, entityId), fixAction: 'Resolve ownership conflict', entityName: entity.name }
        ),
      });
  }

  // UNOWNED_TEAM or UNOWNED_DEPARTMENT issue
  if (!resolution.ownerPersonId) {
    const issueType = entityType === 'TEAM' ? 'UNOWNED_TEAM' : 'UNOWNED_DEPARTMENT';
    // For teams, exclude unassigned teams (departmentId: null)
    if (entityType === 'TEAM' && 'departmentId' in entity && entity.departmentId === null) {
      // Skip UNOWNED_TEAM for unassigned teams - they get UNASSIGNED_TEAM instead
    } else {
      const issueKey = `${issueType}:${entityType}:${entityId}`;
      issues.push({
        issueKey,
        issueId: issueKey,
        type: issueType,
        severity: 'warning',
        entityType,
        entityId,
        entityName: entity.name,
        explanation: `${entityType} "${entity.name}" has no assigned owner. Assign an owner to ensure accountability.`,
        fixUrl: entityType === 'TEAM' ? deepLinkForTeam(workspaceSlug, entityId) : deepLinkForDepartment(workspaceSlug, entityId),
        fixAction: `Assign ${entityType.toLowerCase()} owner`,
        explainability: buildIssueExplainability(
          { type: issueType, entityType, entityId, issueKey },
          { fixUrl: entityType === 'TEAM' ? deepLinkForTeam(workspaceSlug, entityId) : deepLinkForDepartment(workspaceSlug, entityId), fixAction: `Assign ${entityType.toLowerCase()} owner`, entityName: entity.name }
        ),
      });
    }
  }

  // UNASSIGNED_TEAM issue (only for teams without department)
  if (entityType === 'TEAM' && 'departmentId' in entity && entity.departmentId === null) {
    const issueKey = `UNASSIGNED_TEAM:TEAM:${entityId}`;
    issues.push({
      issueKey,
      issueId: issueKey,
      type: 'UNASSIGNED_TEAM',
      severity: 'info',
      entityType: 'TEAM',
      entityId,
      entityName: entity.name,
      explanation: `Team "${entity.name}" is not assigned to any department. Assign it to a department to organize your structure.`,
      fixUrl: deepLinkForUnassignedTeam(workspaceSlug, entityId),
      fixAction: 'Assign team to department',
      explainability: buildIssueExplainability(
        { type: 'UNASSIGNED_TEAM', entityType: 'TEAM', entityId, issueKey },
        { fixUrl: deepLinkForUnassignedTeam(workspaceSlug, entityId), fixAction: 'Assign team to department', entityName: entity.name }
      ),
    });
  }

  return issues;
}

// ============================================================================
// Phase G: Capacity & Availability Issue Derivation
// ============================================================================

import type { EffectiveCapacity } from "./capacity/resolveEffectiveCapacity";
import type { ContractResolution } from "./capacity/read";
// import type { RoleCoverage } from "./coverage/read"; // Module not found
type RoleCoverage = {
  id: string;
  roleType: string;
  roleLabel: string | null;
  primaryPersonId: string;
  secondaryPersonIds: string[];
};

/**
 * Capacity issue thresholds (re-exported from thresholds.ts for backwards compat)
 */
export type { CapacityThresholds } from "./capacity/thresholds";
import { 
  DEFAULT_CAPACITY_THRESHOLDS as THRESHOLDS,
  EVIDENCE_VERSION,
  SEMANTICS_VERSION,
  CAPACITY_DATA_ASSUMPTIONS,
} from "./capacity/thresholds";
export const DEFAULT_CAPACITY_THRESHOLDS = THRESHOLDS;

/**
 * Input context for capacity issue derivation
 * Uses RESOLVER OUTPUTS, not raw data (avoids tight coupling)
 */
export type CapacityIssueContext = {
  // Time window for all capacity checks (required, UTC)
  timeWindow: { start: Date; end: Date };
  
  // Workspace slug for generating deep links
  workspaceSlug: string;

  // From effective capacity resolver
  effectiveCapacities: Map<string, EffectiveCapacity>;
  
  // From contract resolver (for conflict detection)
  contractResolutions: Map<string, ContractResolution>;
  
  // From ownership resolver (existing)
  teamOwnershipResolutions: Map<string, OwnerResolution>;
  deptOwnershipResolutions: Map<string, OwnerResolution>;
  
  // From role coverage (G6) — primaries treated as critical owners
  roleCoverages?: RoleCoverage[];
  
  // Person metadata (for fix URLs and names)
  personMetadata: Map<string, { name: string }>;
  
  // Workspace-scoped thresholds
  thresholds: {
    lowCapacityHoursThreshold: number;
    overallocationThreshold: number;
    minCapacityForCoverage: number;
  };
};

/**
 * Derive capacity-related issues from resolver outputs
 * 
 * Phase G: Issues are derived from resolver outputs, not raw data.
 * This ensures consistency with capacity computations.
 * 
 * Rule: If min availabilityFactor in window == 0 → UNAVAILABLE_OWNER
 */
export function deriveCapacityIssues(
  context: CapacityIssueContext
): OrgIssueMetadata[] {
  const issues: OrgIssueMetadata[] = [];
  const { thresholds, timeWindow, workspaceSlug } = context;

  // Helper for ISO date strings
  const windowStart = timeWindow.start.toISOString();
  const windowEnd = timeWindow.end.toISOString();

  // 1. CAPACITY_CONTRACT_CONFLICT issues
  for (const [personId, resolution] of context.contractResolutions) {
    if (resolution.hasConflict) {
      const personName = context.personMetadata.get(personId)?.name ?? personId;
      const issueKey = `CAPACITY_CONTRACT_CONFLICT:PERSON:${personId}`;
      
      const evidence: CapacityContractConflictEvidence = {
        evidenceVersion: 1,
        contractIds: resolution.conflictingContracts.map(c => c.id),
        overlappingRanges: resolution.conflictingContracts.map(c => ({
          start: c.effectiveFrom.toISOString(),
          end: c.effectiveTo?.toISOString() ?? null,
        })),
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'CAPACITY_CONTRACT_CONFLICT',
        severity: 'error',
        entityType: 'PERSON',
        entityId: personId,
        entityName: personName,
        explanation: `${personName} has ${resolution.conflictingContracts.length} overlapping capacity contracts. Resolve the conflict to ensure accurate capacity calculations.`,
        fixUrl: `/org/people/${personId}`,
        fixAction: 'Resolve contract conflict',
        evidence,
        explainability: buildIssueExplainability(
          { type: 'CAPACITY_CONTRACT_CONFLICT', entityType: 'PERSON', entityId: personId, issueKey },
          { fixUrl: `/org/people/${personId}`, fixAction: 'Resolve contract conflict', entityName: personName, evidence }
        ),
      });
    }
  }

  // 2. OVERALLOCATED_PERSON issues
  for (const [personId, capacity] of context.effectiveCapacities) {
    // Calculate allocation percent relative to available capacity
    const availableHours = capacity.contractedHours * capacity.availabilityFactor;
    const totalAllocationPercent = availableHours > 0 
      ? capacity.allocatedHours / availableHours 
      : (capacity.allocatedHours > 0 ? Infinity : 0);
    
    if (totalAllocationPercent > thresholds.overallocationThreshold) {
      const personName = context.personMetadata.get(personId)?.name ?? personId;
      const issueKey = `OVERALLOCATED_PERSON:PERSON:${personId}`;
      
      const evidence: OverallocatedPersonEvidence = {
        evidenceVersion: 1,
        totalPercent: totalAllocationPercent,
        totalAllocatedHours: capacity.allocatedHours,
        contractWeeklyHours: capacity.contractedHours,
        thresholdPercent: thresholds.overallocationThreshold,
        allocations: [], // TODO: Populate from allocation data if available
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'OVERALLOCATED_PERSON',
        severity: 'warning',
        entityType: 'PERSON',
        entityId: personId,
        entityName: personName,
        explanation: `${personName} is overallocated at ${Math.round(totalAllocationPercent * 100)}% of capacity (threshold: ${Math.round(thresholds.overallocationThreshold * 100)}%).`,
        fixUrl: `/org/people/${personId}`,
        fixAction: 'Review allocations',
        evidence,
        explainability: buildIssueExplainability(
          { type: 'OVERALLOCATED_PERSON', entityType: 'PERSON', entityId: personId, issueKey },
          { fixUrl: `/org/people/${personId}`, fixAction: 'Review allocations', entityName: personName, evidence }
        ),
      });
    }
  }

  // 3. LOW_EFFECTIVE_CAPACITY issues
  for (const [personId, capacity] of context.effectiveCapacities) {
    if (capacity.effectiveAvailableHours < thresholds.lowCapacityHoursThreshold &&
        capacity.effectiveAvailableHours > 0) {
      const personName = context.personMetadata.get(personId)?.name ?? personId;
      const issueKey = `LOW_EFFECTIVE_CAPACITY:PERSON:${personId}`;
      
      const evidence: LowEffectiveCapacityEvidence = {
        evidenceVersion: 1,
        effectiveAvailableHours: capacity.effectiveAvailableHours,
        thresholdHours: thresholds.lowCapacityHoursThreshold,
        windowStart,
        windowEnd,
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: 'LOW_EFFECTIVE_CAPACITY',
        severity: 'warning',
        entityType: 'PERSON',
        entityId: personId,
        entityName: personName,
        explanation: `${personName} has only ${capacity.effectiveAvailableHours.toFixed(1)}h available capacity (below ${thresholds.lowCapacityHoursThreshold}h threshold).`,
        fixUrl: `/org/people/${personId}`,
        fixAction: 'Review capacity',
        evidence,
        explainability: buildIssueExplainability(
          { type: 'LOW_EFFECTIVE_CAPACITY', entityType: 'PERSON', entityId: personId, issueKey },
          { fixUrl: `/org/people/${personId}`, fixAction: 'Review capacity', entityName: personName, evidence }
        ),
      });
    }
  }

  // 4. UNAVAILABLE_OWNER issues for teams
  // Rule: If min availabilityFactor in window == 0 → UNAVAILABLE_OWNER
  for (const [teamId, ownership] of context.teamOwnershipResolutions) {
    if (ownership.ownerPersonId) {
      const ownerCapacity = context.effectiveCapacities.get(ownership.ownerPersonId);
      if (ownerCapacity && ownerCapacity.availabilityFactor === 0) {
        const ownerName = context.personMetadata.get(ownership.ownerPersonId)?.name ?? ownership.ownerPersonId;
        const issueKey = `UNAVAILABLE_OWNER:TEAM:${teamId}`;
        
        const evidence: UnavailableOwnerEvidence = {
          evidenceVersion: 1,
          entityType: 'TEAM',
          entityId: teamId,
          ownerPersonId: ownership.ownerPersonId,
          windowStart,
          windowEnd,
          limitingEvent: null, // TODO: Populate from availability data
        };

        issues.push({
          issueKey,
          issueId: issueKey,
          type: 'UNAVAILABLE_OWNER',
          severity: 'warning',
          entityType: 'TEAM',
          entityId: teamId,
          entityName: `Team owned by ${ownerName}`,
          explanation: `Team owner ${ownerName} is unavailable during the selected time window.`,
          fixUrl: deepLinkForTeam(workspaceSlug, teamId),
          fixAction: 'Assign backup owner',
          evidence,
          explainability: buildIssueExplainability(
            { type: 'UNAVAILABLE_OWNER', entityType: 'TEAM', entityId: teamId, issueKey },
            { fixUrl: deepLinkForTeam(workspaceSlug, teamId), fixAction: 'Assign backup owner', entityName: `Team owned by ${ownerName}`, evidence }
          ),
        });
      }
    }
  }

  // 5. UNAVAILABLE_OWNER issues for departments
  for (const [deptId, ownership] of context.deptOwnershipResolutions) {
    if (ownership.ownerPersonId) {
      const ownerCapacity = context.effectiveCapacities.get(ownership.ownerPersonId);
      if (ownerCapacity && ownerCapacity.availabilityFactor === 0) {
        const ownerName = context.personMetadata.get(ownership.ownerPersonId)?.name ?? ownership.ownerPersonId;
        const issueKey = `UNAVAILABLE_OWNER:DEPARTMENT:${deptId}`;
        
        const evidence: UnavailableOwnerEvidence = {
          evidenceVersion: 1,
          entityType: 'DEPARTMENT',
          entityId: deptId,
          ownerPersonId: ownership.ownerPersonId,
          windowStart,
          windowEnd,
          limitingEvent: null,
        };

        issues.push({
          issueKey,
          issueId: issueKey,
          type: 'UNAVAILABLE_OWNER',
          severity: 'warning',
          entityType: 'DEPARTMENT',
          entityId: deptId,
          entityName: `Department owned by ${ownerName}`,
          explanation: `Department owner ${ownerName} is unavailable during the selected time window.`,
          fixUrl: deepLinkForDepartment(workspaceSlug, deptId),
          fixAction: 'Assign backup owner',
          evidence,
          explainability: buildIssueExplainability(
            { type: 'UNAVAILABLE_OWNER', entityType: 'DEPARTMENT', entityId: deptId, issueKey },
            { fixUrl: deepLinkForDepartment(workspaceSlug, deptId), fixAction: 'Assign backup owner', entityName: `Department owned by ${ownerName}`, evidence }
          ),
        });
      }
    }
  }

  // 6. UNAVAILABLE_OWNER issues for RoleCoverage primaries (G6)
  if (context.roleCoverages) {
    for (const coverage of context.roleCoverages) {
      const primaryCapacity = context.effectiveCapacities.get(coverage.primaryPersonId);
      if (primaryCapacity && primaryCapacity.availabilityFactor === 0) {
        const primaryName = context.personMetadata.get(coverage.primaryPersonId)?.name ?? coverage.primaryPersonId;
        const issueKey = `UNAVAILABLE_OWNER:ROLE_COVERAGE:${coverage.id}`;
        
        const evidence: UnavailableOwnerEvidence = {
          evidenceVersion: 1,
          entityType: 'ROLE_COVERAGE',
          entityId: coverage.id,
          ownerPersonId: coverage.primaryPersonId,
          windowStart,
          windowEnd,
          limitingEvent: null,
        };

        issues.push({
          issueKey,
          issueId: issueKey,
          type: 'UNAVAILABLE_OWNER',
          severity: 'warning',
          entityType: 'ROLE_COVERAGE',
          entityId: coverage.id,
          entityName: `${coverage.roleLabel ?? coverage.roleType} (${primaryName})`,
          explanation: `${coverage.roleLabel ?? coverage.roleType} primary ${primaryName} is unavailable during the selected time window.`,
          fixUrl: `/org/coverage`,
          fixAction: 'Check backup coverage',
          evidence,
          explainability: buildIssueExplainability(
            { type: 'UNAVAILABLE_OWNER', entityType: 'ROLE_COVERAGE', entityId: coverage.id, issueKey },
            { fixUrl: `/org/coverage`, fixAction: 'Check backup coverage', entityName: `${coverage.roleLabel ?? coverage.roleType} (${primaryName})`, evidence }
          ),
        });
      }
    }
  }

  // 7. SINGLE_POINT_OF_FAILURE issues (G6)
  // Rule: If RoleCoverage exists but secondaryPersonIds.length === 0
  if (context.roleCoverages) {
    for (const coverage of context.roleCoverages) {
      if (coverage.secondaryPersonIds.length === 0) {
        const primaryName = context.personMetadata.get(coverage.primaryPersonId)?.name ?? coverage.primaryPersonId;
        const issueKey = `SINGLE_POINT_OF_FAILURE:ROLE_COVERAGE:${coverage.id}`;
        
        const evidence: SinglePointOfFailureEvidence = {
          evidenceVersion: 1,
          roleType: coverage.roleType,
          primaryPersonId: coverage.primaryPersonId,
          secondaryCount: 0,
        };

        issues.push({
          issueKey,
          issueId: issueKey,
          type: 'SINGLE_POINT_OF_FAILURE',
          severity: 'warning',
          entityType: 'ROLE_COVERAGE',
          entityId: coverage.id,
          entityName: `${coverage.roleLabel ?? coverage.roleType} (${primaryName})`,
          explanation: `${coverage.roleLabel ?? coverage.roleType} has no backup personnel defined. If ${primaryName} is unavailable, there is no coverage.`,
          fixUrl: `/org/coverage`,
          fixAction: 'Add backup personnel',
          evidence,
          explainability: buildIssueExplainability(
            { type: 'SINGLE_POINT_OF_FAILURE', entityType: 'ROLE_COVERAGE', entityId: coverage.id, issueKey },
            { fixUrl: `/org/coverage`, fixAction: 'Add backup personnel', entityName: `${coverage.roleLabel ?? coverage.roleType} (${primaryName})`, evidence }
          ),
        });
      }
    }
  }

  // 8. NO_AVAILABLE_COVER issues (G6)
  // Rule: Primary unavailable + no viable secondaries
  if (context.roleCoverages) {
    for (const coverage of context.roleCoverages) {
      const primaryCapacity = context.effectiveCapacities.get(coverage.primaryPersonId);
      
      // Only check if primary is unavailable
      if (primaryCapacity && primaryCapacity.availabilityFactor === 0) {
        // Check if any secondary is viable
        const viableSecondaryIds: string[] = [];
        
        for (const secondaryId of coverage.secondaryPersonIds) {
          const secondaryCapacity = context.effectiveCapacities.get(secondaryId);
          if (secondaryCapacity && 
              secondaryCapacity.availabilityFactor > 0 && 
              secondaryCapacity.effectiveAvailableHours >= thresholds.minCapacityForCoverage) {
            viableSecondaryIds.push(secondaryId);
          }
        }

        if (viableSecondaryIds.length === 0 && coverage.secondaryPersonIds.length > 0) {
          const primaryName = context.personMetadata.get(coverage.primaryPersonId)?.name ?? coverage.primaryPersonId;
          const issueKey = `NO_AVAILABLE_COVER:ROLE_COVERAGE:${coverage.id}`;
          
          const evidence: NoAvailableCoverEvidence = {
            evidenceVersion: 1,
            roleType: coverage.roleType,
            primaryPersonId: coverage.primaryPersonId,
            evaluatedSecondaryIds: coverage.secondaryPersonIds,
            viableSecondaryIds: [],
            minCapacityThreshold: thresholds.minCapacityForCoverage,
          };

          issues.push({
            issueKey,
            issueId: issueKey,
            type: 'NO_AVAILABLE_COVER',
            severity: 'error',
            entityType: 'ROLE_COVERAGE',
            entityId: coverage.id,
            entityName: `${coverage.roleLabel ?? coverage.roleType} (${primaryName})`,
            explanation: `${coverage.roleLabel ?? coverage.roleType} primary ${primaryName} is unavailable and no backup personnel have sufficient capacity (>= ${thresholds.minCapacityForCoverage}h).`,
            fixUrl: `/org/coverage`,
            fixAction: 'Resolve coverage gap',
            evidence,
            explainability: buildIssueExplainability(
              { type: 'NO_AVAILABLE_COVER', entityType: 'ROLE_COVERAGE', entityId: coverage.id, issueKey },
              { fixUrl: `/org/coverage`, fixAction: 'Resolve coverage gap', entityName: `${coverage.roleLabel ?? coverage.roleType} (${primaryName})`, evidence }
            ),
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Complete capacity issues result with metadata
 * 
 * This is the canonical format for API responses and LoopBrain consumption.
 * Always includes issueWindow, thresholds, and responseMeta for transparency.
 */
export type CapacityIssuesResult = {
  issues: OrgIssueMetadata[];
  issueWindow: {
    start: string;
    end: string;
    label: string;
  };
  thresholds: {
    lowCapacityHoursThreshold: number;
    overallocationThreshold: number;
    minCapacityForCoverage: number;
  };
  responseMeta: {
    generatedAt: string;
    /** Stable identifier for the assumptions set */
    assumptionsId: string;
    dataAssumptions: readonly string[];
    /** Schema version of evidence payloads */
    evidenceVersion: number;
    /** Version of computation logic/semantics */
    semanticsVersion: number;
  };
};

/**
 * Derive capacity issues with full metadata (for API responses)
 * 
 * This wrapper adds issueWindow, thresholds, and responseMeta to the response,
 * ensuring all consumers know the context of the derived issues.
 */
export function deriveCapacityIssuesWithMetadata(
  context: CapacityIssueContext
): CapacityIssuesResult {
  const issues = deriveCapacityIssues(context);
  
  return {
    issues,
    issueWindow: {
      start: context.timeWindow.start.toISOString(),
      end: context.timeWindow.end.toISOString(),
      label: `${Math.round((context.timeWindow.end.getTime() - context.timeWindow.start.getTime()) / (1000 * 60 * 60 * 24))} days`,
    },
    thresholds: context.thresholds,
    responseMeta: {
      generatedAt: new Date().toISOString(),
      assumptionsId: `capacity-issues:v${SEMANTICS_VERSION}`,
      dataAssumptions: CAPACITY_DATA_ASSUMPTIONS,
      evidenceVersion: EVIDENCE_VERSION,
      semanticsVersion: SEMANTICS_VERSION,
    },
  };
}

// ============================================================================
// Capacity v1: Team-Level & Missing-Data Issue Derivation
// ============================================================================

import type { TeamCapacityRollup, PersonCapacityMeta } from "./capacity/status";

/**
 * Input for Capacity v1 team-level issue derivation.
 */
export type CapacityV1IssueContext = {
  timeWindow: { start: Date; end: Date };
  workspaceSlug: string;
  teamRollups: TeamCapacityRollup[];
  /** Per-person metadata for missing-data detection */
  personMetas: Map<string, PersonCapacityMeta>;
  personMetadata: Map<string, { name: string }>;
  thresholds: {
    overallocationThreshold: number;
    severeOverloadThresholdPct: number;
    underutilizedThresholdPct: number;
    defaultWeeklyHoursTarget: number;
  };
};

/**
 * Derive Capacity v1 issues: missing data (person-level) + team-level capacity issues.
 *
 * These augment the existing Phase G issues (OVERALLOCATED_PERSON, etc.)
 * with team-level signals and missing-data detection.
 */
export function deriveCapacityV1Issues(
  context: CapacityV1IssueContext
): OrgIssueMetadata[] {
  const issues: OrgIssueMetadata[] = [];
  const { thresholds, timeWindow, workspaceSlug } = context;
  const windowStart = timeWindow.start.toISOString();
  const windowEnd = timeWindow.end.toISOString();

  // 1. CAPACITY_MISSING_DATA_PERSON issues
  for (const [personId, meta] of context.personMetas) {
    if (meta.isContractDefault && !meta.hasAvailabilityData) {
      const personName = context.personMetadata.get(personId)?.name ?? personId;
      const issueKey = `CAPACITY_MISSING_DATA_PERSON:PERSON:${personId}`;

      const evidence: CapacityMissingDataPersonEvidence = {
        evidenceVersion: 1,
        hasContract: false,
        hasAvailability: false,
        defaultWeeklyHoursUsed: thresholds.defaultWeeklyHoursTarget,
        semanticsVersion: SEMANTICS_VERSION,
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: "CAPACITY_MISSING_DATA_PERSON",
        severity: "warning",
        entityType: "PERSON",
        entityId: personId,
        entityName: personName,
        explanation: `${personName} has no capacity data configured. Using default ${thresholds.defaultWeeklyHoursTarget}h/week assumption.`,
        fixUrl: deepLinkForPersonCapacity(workspaceSlug, personId),
        fixAction: "Set capacity",
        evidence,
        explainability: buildIssueExplainability(
          { type: "CAPACITY_MISSING_DATA_PERSON", entityType: "PERSON", entityId: personId, issueKey },
          { fixUrl: deepLinkForPersonCapacity(workspaceSlug, personId), fixAction: "Set capacity", entityName: personName, evidence }
        ),
      });
    }
  }

  // 2. Team-level issues from rollups
  for (const rollup of context.teamRollups) {
    // CAPACITY_TEAM_NO_MEMBERS
    if (rollup.memberCount === 0) {
      const issueKey = `CAPACITY_TEAM_NO_MEMBERS:TEAM:${rollup.teamId}`;
      const evidence: CapacityTeamNoMembersEvidence = {
        evidenceVersion: 1,
        teamId: rollup.teamId,
        teamName: rollup.teamName,
        departmentId: rollup.departmentId,
        semanticsVersion: SEMANTICS_VERSION,
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: "CAPACITY_TEAM_NO_MEMBERS",
        severity: "info",
        entityType: "TEAM",
        entityId: rollup.teamId,
        entityName: rollup.teamName,
        explanation: `Team "${rollup.teamName}" has no active members. Capacity cannot be computed.`,
        fixUrl: deepLinkForTeamInStructure(workspaceSlug, rollup.teamId),
        fixAction: "Assign team members",
        evidence,
        explainability: buildIssueExplainability(
          { type: "CAPACITY_TEAM_NO_MEMBERS", entityType: "TEAM", entityId: rollup.teamId, issueKey },
          { fixUrl: deepLinkForTeamInStructure(workspaceSlug, rollup.teamId), fixAction: "Assign team members", entityName: rollup.teamName, evidence }
        ),
      });
      continue; // Skip utilization checks for empty teams
    }

    // CAPACITY_SEVERELY_OVERLOADED_TEAM
    if (rollup.utilizationPct >= thresholds.severeOverloadThresholdPct) {
      const issueKey = `CAPACITY_SEVERELY_OVERLOADED_TEAM:TEAM:${rollup.teamId}`;
      const evidence: CapacityOverloadedTeamEvidence = {
        evidenceVersion: 1,
        teamId: rollup.teamId,
        teamName: rollup.teamName,
        memberCount: rollup.memberCount,
        availableHours: rollup.availableHours,
        allocatedHours: rollup.allocatedHours,
        utilizationPct: rollup.utilizationPct,
        thresholdPct: thresholds.severeOverloadThresholdPct,
        isSevere: true,
        windowStart,
        windowEnd,
        semanticsVersion: SEMANTICS_VERSION,
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: "CAPACITY_SEVERELY_OVERLOADED_TEAM",
        severity: "error",
        entityType: "TEAM",
        entityId: rollup.teamId,
        entityName: rollup.teamName,
        explanation: `Team "${rollup.teamName}" is severely overloaded at ${Math.round(rollup.utilizationPct * 100)}% utilization (threshold: ${Math.round(thresholds.severeOverloadThresholdPct * 100)}%).`,
        fixUrl: deepLinkForTeam(workspaceSlug, rollup.teamId),
        fixAction: "Review team capacity",
        evidence,
        explainability: buildIssueExplainability(
          { type: "CAPACITY_SEVERELY_OVERLOADED_TEAM", entityType: "TEAM", entityId: rollup.teamId, issueKey },
          { fixUrl: deepLinkForTeam(workspaceSlug, rollup.teamId), fixAction: "Review team capacity", entityName: rollup.teamName, evidence }
        ),
      });
    }
    // CAPACITY_OVERLOADED_TEAM (not severe)
    else if (rollup.utilizationPct >= thresholds.overallocationThreshold) {
      const issueKey = `CAPACITY_OVERLOADED_TEAM:TEAM:${rollup.teamId}`;
      const evidence: CapacityOverloadedTeamEvidence = {
        evidenceVersion: 1,
        teamId: rollup.teamId,
        teamName: rollup.teamName,
        memberCount: rollup.memberCount,
        availableHours: rollup.availableHours,
        allocatedHours: rollup.allocatedHours,
        utilizationPct: rollup.utilizationPct,
        thresholdPct: thresholds.overallocationThreshold,
        isSevere: false,
        windowStart,
        windowEnd,
        semanticsVersion: SEMANTICS_VERSION,
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: "CAPACITY_OVERLOADED_TEAM",
        severity: "warning",
        entityType: "TEAM",
        entityId: rollup.teamId,
        entityName: rollup.teamName,
        explanation: `Team "${rollup.teamName}" is overloaded at ${Math.round(rollup.utilizationPct * 100)}% utilization (threshold: ${Math.round(thresholds.overallocationThreshold * 100)}%).`,
        fixUrl: deepLinkForTeam(workspaceSlug, rollup.teamId),
        fixAction: "Review team capacity",
        evidence,
        explainability: buildIssueExplainability(
          { type: "CAPACITY_OVERLOADED_TEAM", entityType: "TEAM", entityId: rollup.teamId, issueKey },
          { fixUrl: deepLinkForTeam(workspaceSlug, rollup.teamId), fixAction: "Review team capacity", entityName: rollup.teamName, evidence }
        ),
      });
    }

    // CAPACITY_UNDERUTILIZED_TEAM
    if (
      rollup.availableHours > 0 &&
      rollup.utilizationPct <= thresholds.underutilizedThresholdPct &&
      rollup.memberCount > 0
    ) {
      const issueKey = `CAPACITY_UNDERUTILIZED_TEAM:TEAM:${rollup.teamId}`;
      const evidence: CapacityUnderutilizedTeamEvidence = {
        evidenceVersion: 1,
        teamId: rollup.teamId,
        teamName: rollup.teamName,
        memberCount: rollup.memberCount,
        availableHours: rollup.availableHours,
        allocatedHours: rollup.allocatedHours,
        utilizationPct: rollup.utilizationPct,
        thresholdPct: thresholds.underutilizedThresholdPct,
        windowStart,
        windowEnd,
        semanticsVersion: SEMANTICS_VERSION,
      };

      issues.push({
        issueKey,
        issueId: issueKey,
        type: "CAPACITY_UNDERUTILIZED_TEAM",
        severity: "info",
        entityType: "TEAM",
        entityId: rollup.teamId,
        entityName: rollup.teamName,
        explanation: `Team "${rollup.teamName}" is underutilized at ${Math.round(rollup.utilizationPct * 100)}% utilization (threshold: ${Math.round(thresholds.underutilizedThresholdPct * 100)}%).`,
        fixUrl: deepLinkForTeam(workspaceSlug, rollup.teamId),
        fixAction: "Review team allocation",
        evidence,
        explainability: buildIssueExplainability(
          { type: "CAPACITY_UNDERUTILIZED_TEAM", entityType: "TEAM", entityId: rollup.teamId, issueKey },
          { fixUrl: deepLinkForTeam(workspaceSlug, rollup.teamId), fixAction: "Review team allocation", entityName: rollup.teamName, evidence }
        ),
      });
    }
  }

  return issues;
}

// ============================================================================
// Phase P: Work Impact Issues Derivation
// ============================================================================

/**
 * Derive WORK_IMPACT_UNDEFINED issues for work requests with no explicit impacts.
 * 
 * @param workspaceId - Workspace context
 * @param workRequests - Array of work requests to check
 * @param impactSummaries - Map of workRequestId -> WorkImpactSummary (summary-only, not full resolutions)
 * @returns Array of OrgIssueMetadata for work requests with undefined impacts
 */
export async function deriveWorkImpactIssues(
  workspaceId: string,
  workRequests: Array<{ id: string; title: string; priority: "P0" | "P1" | "P2" | "P3"; status: "OPEN" | "CLOSED" }>,
  impactSummaries: Map<string, import("@/lib/org/impact/types").WorkImpactSummary>
): Promise<OrgIssueMetadata[]> {
  const issues: OrgIssueMetadata[] = [];

  // Filter to OPEN work requests only
  const openWorkRequests = workRequests.filter((wr) => wr.status === "OPEN");

  for (const workRequest of openWorkRequests) {
    const impactSummary = impactSummaries.get(workRequest.id);

    // Skip if no impact summary (shouldn't happen, but defensive)
    if (!impactSummary) {
      continue;
    }

    // CORRECTED CONDITION: Check explicitCount === 0 (regardless of inferred)
    if (impactSummary.explicitCount === 0) {
      const issueKey = `WORK_IMPACT_UNDEFINED:WORK_REQUEST:${workRequest.id}`;
      const isHighPriority = workRequest.priority === "P0" || workRequest.priority === "P1";
      const severity: "error" | "warning" = isHighPriority ? "error" : "warning";

      const evidence: WorkImpactUndefinedEvidence = {
        evidenceVersion: 1,
        workRequestId: workRequest.id,
        workRequestTitle: workRequest.title,
        inferredCount: impactSummary.inferredCount, // Include for display
        semanticsVersion: 1,
      };

      const fixUrl = `/org/work/${workRequest.id}`;
      const fixAction = "Add explicit impacts";

      issues.push({
        issueKey,
        issueId: issueKey,
        type: "WORK_IMPACT_UNDEFINED",
        severity,
        entityType: "WORK_REQUEST",
        entityId: workRequest.id,
        entityName: workRequest.title,
        explanation: isHighPriority
          ? "High-priority work should define who is affected to avoid blind risk."
          : "This work request has no explicit impacts defined.",
        fixUrl,
        fixAction,
        evidence,
        explainability: buildIssueExplainability(
          {
            type: "WORK_IMPACT_UNDEFINED",
            entityType: "WORK_REQUEST",
            entityId: workRequest.id,
            issueKey,
          },
          {
            fixUrl,
            fixAction,
            entityName: workRequest.title,
            evidence,
          }
        ),
      });
    }
  }

  return issues;
}
