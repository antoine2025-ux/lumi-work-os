/**
 * Ownership Resolver
 *
 * Pure function that computes ownership signals from intelligence data.
 * No side effects, no Prisma calls, no writes.
 *
 * Canonical rules:
 * - OwnerAssignment is authoritative source
 * - entity.ownerPersonId is fallback
 * - If both exist and differ, OwnerAssignment wins (emit OWNERSHIP_CONFLICT)
 * - Unassigned teams (departmentId = null) excluded from coverage totals
 *
 * Coverage percentages:
 * - Use Math.floor for conservative reporting (66.6% → 66%, not 67%)
 * - Prevents UI churn from rounding instability
 *
 * Issue aggregation:
 * - Emits summary issues when count > threshold (avoids N issues for N entities)
 * - Per-entity details available via unownedEntities array
 *
 * See docs/org/intelligence-rules.md for canonical rules.
 */

import type { IntelligenceData } from "../queries";
import type {
  OwnershipSignals,
  EntityRef,
  ExplainableIssue,
  OwnershipSource,
  EntityOwnershipState,
  OwnershipConflictMeta,
  EntityKeyFormat,
  LowercaseEntityType,
} from "../snapshotTypes";
import {
  createEntityRef,
  createEntityKey,
  normalizeEntityTypeFromDB,
  ISSUE_AGGREGATION_THRESHOLD,
  ISSUE_PREVIEW_COUNT,
} from "../snapshotTypes";

/**
 * Resolution result for a single entity.
 * Includes both owner IDs for conflict audit trail.
 */
type EntityResolution = {
  ownerId: string | null;
  source: OwnershipSource | null;
  hasConflict: boolean;
  /** Present only if hasConflict is true */
  assignmentOwnerId?: string;
  /** Present only if hasConflict is true */
  entityOwnerPersonId?: string;
};

/**
 * Resolve ownership for a single entity using canonical precedence.
 * Uses lowercase entity type for internal consistency.
 */
function resolveEntityOwnership(
  entityType: LowercaseEntityType,
  entityId: string,
  ownerPersonId: string | null,
  ownerAssignments: Map<EntityKeyFormat, string>
): EntityResolution {
  const assignmentKey = createEntityKey(entityType, entityId);
  const assignmentOwnerId = ownerAssignments.get(assignmentKey) ?? null;

  // Check for conflict: both sources exist and differ
  const hasConflict = !!(
    assignmentOwnerId &&
    ownerPersonId &&
    assignmentOwnerId !== ownerPersonId
  );

  // Authoritative precedence: ownerAssignment > ownerPersonId
  if (assignmentOwnerId) {
    return {
      ownerId: assignmentOwnerId,
      source: "ownerAssignment",
      hasConflict,
      // Include both IDs for conflict audit trail
      ...(hasConflict && {
        assignmentOwnerId,
        entityOwnerPersonId: ownerPersonId!,
      }),
    };
  }

  if (ownerPersonId) {
    return {
      ownerId: ownerPersonId,
      source: "ownerPersonId",
      hasConflict: false,
    };
  }

  return {
    ownerId: null,
    source: null,
    hasConflict: false,
  };
}

/**
 * Calculate percentage using Math.floor for conservative reporting.
 * Returns 100 if total is 0 (no entities = 100% coverage).
 */
function calculatePercent(owned: number, total: number): number {
  if (total === 0) return 100;
  return Math.floor((owned / total) * 100);
}

/**
 * Resolve ownership signals from intelligence data.
 * Pure function: same input produces same output.
 *
 * @param data - Intelligence data from loadIntelligenceData()
 * @returns Ownership signals
 */
export function resolveOwnershipSignals(data: IntelligenceData): OwnershipSignals {
  const issues: ExplainableIssue[] = [];
  const unownedEntities: EntityRef[] = [];
  const unassignedTeamsExcludedFromCoverage: EntityRef[] = [];
  // Note: conflicts[] will be derived from ownershipByEntity at the end
  const ownershipByEntity: Record<EntityKeyFormat, EntityOwnershipState> = {};

  // Build owner assignment lookup map with normalized lowercase keys
  const ownerAssignments = new Map<EntityKeyFormat, string>();
  const unknownEntityTypes: string[] = [];
  let unknownAssignmentCount = 0;

  for (const assignment of data.ownerAssignments) {
    // Normalize DB entity type to lowercase at the edge
    const normalizedType = normalizeEntityTypeFromDB(assignment.entityType);
    if (normalizedType) {
      const key = createEntityKey(normalizedType, assignment.entityId);
      ownerAssignments.set(key, assignment.ownerPersonId);
    } else {
      // Track unknown entity types for debugging (aggregate, don't spam)
      unknownAssignmentCount++;
      if (!unknownEntityTypes.includes(assignment.entityType)) {
        unknownEntityTypes.push(assignment.entityType);
      }
    }
  }

  // Emit single aggregated info issue if unknown entity types found
  if (unknownEntityTypes.length > 0) {
    issues.push({
      code: "OWNERSHIP_UNKNOWN_ENTITY_TYPE",
      severity: "info",
      title: "Unknown entity types in owner assignments",
      detail: `Found ${unknownAssignmentCount} assignment(s) with unknown entity types: ${unknownEntityTypes.join(", ")}. These are ignored.`,
      meta: {
        unknownTypes: unknownEntityTypes,
        assignmentCount: unknownAssignmentCount, // Renamed for clarity (issue #5)
      },
    });
  }

  // Track conflicts with full metadata for issue emission
  type ConflictData = {
    entityRef: EntityRef;
    assignmentOwnerId: string;
    entityOwnerPersonId: string;
  };

  // Process teams
  let teamTotal = 0;
  let teamOwned = 0;
  const unownedTeams: EntityRef[] = [];
  const teamConflicts: ConflictData[] = [];

  for (const team of data.teams) {
    // Unassigned teams (departmentId = null) excluded from coverage
    // This is a structural issue, not ownership - structure resolver handles it
    if (team.departmentId === null) {
      unassignedTeamsExcludedFromCoverage.push(
        createEntityRef("team", team.id, team.name)
      );
      continue;
    }

    teamTotal++;

    const resolution = resolveEntityOwnership(
      "team",
      team.id,
      team.ownerPersonId,
      ownerAssignments
    );

    // Record per-entity state using canonical key format
    const stateKey = createEntityKey("team", team.id);
    ownershipByEntity[stateKey] = {
      entityType: "team",
      entityId: team.id,
      entityName: team.name,
      ownerId: resolution.ownerId,
      source: resolution.source,
      hasConflict: resolution.hasConflict,
      // Include conflict owner IDs for audit (only when conflict exists)
      ...(resolution.hasConflict && resolution.assignmentOwnerId && resolution.entityOwnerPersonId && {
        conflictAssignmentOwnerId: resolution.assignmentOwnerId,
        conflictEntityOwnerPersonId: resolution.entityOwnerPersonId,
      }),
    };

    const entityRef = createEntityRef("team", team.id, team.name);

    if (resolution.ownerId) {
      teamOwned++;
    } else {
      unownedEntities.push(entityRef);
      unownedTeams.push(entityRef);
    }

    if (resolution.hasConflict && resolution.assignmentOwnerId && resolution.entityOwnerPersonId) {
      teamConflicts.push({
        entityRef,
        assignmentOwnerId: resolution.assignmentOwnerId,
        entityOwnerPersonId: resolution.entityOwnerPersonId,
      });
    }
  }

  // Process departments
  let deptTotal = 0;
  let deptOwned = 0;
  const unownedDepts: EntityRef[] = [];
  const deptConflicts: ConflictData[] = [];

  for (const dept of data.departments) {
    deptTotal++;

    const resolution = resolveEntityOwnership(
      "department",
      dept.id,
      dept.ownerPersonId,
      ownerAssignments
    );

    // Record per-entity state using canonical key format
    const stateKey = createEntityKey("department", dept.id);
    ownershipByEntity[stateKey] = {
      entityType: "department",
      entityId: dept.id,
      entityName: dept.name,
      ownerId: resolution.ownerId,
      source: resolution.source,
      hasConflict: resolution.hasConflict,
      // Include conflict owner IDs for audit (only when conflict exists)
      ...(resolution.hasConflict && resolution.assignmentOwnerId && resolution.entityOwnerPersonId && {
        conflictAssignmentOwnerId: resolution.assignmentOwnerId,
        conflictEntityOwnerPersonId: resolution.entityOwnerPersonId,
      }),
    };

    const entityRef = createEntityRef("department", dept.id, dept.name);

    if (resolution.ownerId) {
      deptOwned++;
    } else {
      unownedEntities.push(entityRef);
      unownedDepts.push(entityRef);
    }

    if (resolution.hasConflict && resolution.assignmentOwnerId && resolution.entityOwnerPersonId) {
      deptConflicts.push({
        entityRef,
        assignmentOwnerId: resolution.assignmentOwnerId,
        entityOwnerPersonId: resolution.entityOwnerPersonId,
      });
    }
  }

  // Emit ownership issues with aggregation to avoid N issues for N entities
  emitOwnershipIssues(issues, unownedTeams, "TEAM");
  emitOwnershipIssues(issues, unownedDepts, "DEPARTMENT");
  emitConflictIssues(issues, teamConflicts, "TEAM");
  emitConflictIssues(issues, deptConflicts, "DEPARTMENT");

  // Check for empty departments (departments without teams) included in coverage
  // This is intentional but may confuse users - emit info issue for clarity
  const departmentIdsWithTeams = new Set(
    data.teams.filter((t) => t.departmentId).map((t) => t.departmentId!)
  );
  const emptyDepartmentCount = data.departments.filter(
    (d) => !departmentIdsWithTeams.has(d.id)
  ).length;

  if (emptyDepartmentCount > 0) {
    issues.push({
      code: "OWNERSHIP_COVERAGE_INCLUDES_EMPTY_DEPARTMENTS",
      severity: "info",
      title: "Coverage includes empty departments",
      detail: `${emptyDepartmentCount} department(s) without teams are included in ownership coverage. This is intentional - all departments should have owners regardless of team count.`,
      meta: { emptyDepartmentCount },
    });
  }

  // Calculate percentages (Math.floor for conservative reporting)
  const teamPercent = calculatePercent(teamOwned, teamTotal);
  const deptPercent = calculatePercent(deptOwned, deptTotal);
  const totalEntities = teamTotal + deptTotal;
  const totalOwned = teamOwned + deptOwned;
  const overallPercent = calculatePercent(totalOwned, totalEntities);

  // Derive conflicts[] from ownershipByEntity to ensure invariant
  // INVARIANT: conflicts[] === entries where hasConflict === true
  const conflicts: EntityRef[] = Object.values(ownershipByEntity)
    .filter((state) => state.hasConflict)
    .map((state) => createEntityRef(state.entityType, state.entityId, state.entityName));

  return {
    coverage: {
      teams: {
        total: teamTotal,
        owned: teamOwned,
        unowned: teamTotal - teamOwned,
        percent: teamPercent,
      },
      departments: {
        total: deptTotal,
        owned: deptOwned,
        unowned: deptTotal - deptOwned,
        percent: deptPercent,
      },
      overallPercent,
    },
    unownedEntities,
    unassignedTeamsExcludedFromCoverage,
    conflicts,
    ownershipByEntity,
    issues,
  };
}

/**
 * Emit ownership issues with aggregation.
 * If count > threshold, emit a single summary issue.
 * Otherwise, emit per-entity issues.
 */
function emitOwnershipIssues(
  issues: ExplainableIssue[],
  unowned: EntityRef[],
  entityType: "TEAM" | "DEPARTMENT"
): void {
  if (unowned.length === 0) return;

  const code = entityType === "TEAM" ? "OWNERSHIP_UNOWNED_TEAM" : "OWNERSHIP_UNOWNED_DEPARTMENT";
  const label = entityType === "TEAM" ? "team" : "department";
  const labelPlural = entityType === "TEAM" ? "teams" : "departments";

  if (unowned.length > ISSUE_AGGREGATION_THRESHOLD) {
    // Emit single summary issue with preview entities
    issues.push({
      code,
      severity: "warning",
      title: `${unowned.length} ${labelPlural} need owners`,
      detail: `${unowned.length} ${labelPlural} have no owner assigned. See unownedEntities for details.`,
      entities: unowned.slice(0, ISSUE_PREVIEW_COUNT),
      meta: { count: unowned.length, entityType: label, aggregated: true },
    });
  } else {
    // Emit per-entity issues
    for (const entity of unowned) {
      issues.push({
        code,
        severity: "warning",
        title: `${label.charAt(0).toUpperCase() + label.slice(1)} has no owner`,
        detail: `"${entity.name}" needs an owner assigned.`,
        entities: [entity],
        meta: { entityType: label },
      });
    }
  }
}

/**
 * Conflict data with full audit trail.
 */
type ConflictDataForEmit = {
  entityRef: EntityRef;
  assignmentOwnerId: string;
  entityOwnerPersonId: string;
};

/**
 * Emit conflict issues with aggregation.
 * Uses entity-type-specific codes for filtering.
 * Includes full conflict metadata (both owner IDs) for audit trail.
 */
function emitConflictIssues(
  issues: ExplainableIssue[],
  conflicting: ConflictDataForEmit[],
  entityType: "TEAM" | "DEPARTMENT"
): void {
  if (conflicting.length === 0) return;

  // Use type-specific codes for better filtering/analytics
  const code = entityType === "TEAM"
    ? "OWNERSHIP_CONFLICT_TEAM"
    : "OWNERSHIP_CONFLICT_DEPARTMENT";
  const label = entityType === "TEAM" ? "team" : "department";
  const labelPlural = entityType === "TEAM" ? "teams" : "departments";

  if (conflicting.length > ISSUE_AGGREGATION_THRESHOLD) {
    // Emit single summary issue with preview entities
    issues.push({
      code,
      severity: "warning",
      title: `${conflicting.length} ${labelPlural} have ownership conflicts`,
      detail: `${conflicting.length} ${labelPlural} have different owners in ownerAssignment vs ownerPersonId. Using ownerAssignment.`,
      entities: conflicting.slice(0, ISSUE_PREVIEW_COUNT).map((c) => c.entityRef),
      meta: {
        count: conflicting.length,
        entityType: label,
        source: "ownerAssignment",
        aggregated: true,
      },
    });
  } else {
    // Emit per-entity issues with full conflict metadata
    for (const conflict of conflicting) {
      const conflictMeta: OwnershipConflictMeta = {
        source: "ownerAssignment",
        assignmentOwnerId: conflict.assignmentOwnerId,
        entityOwnerPersonId: conflict.entityOwnerPersonId,
        entityType: label as "team" | "department",
      };

      issues.push({
        code,
        severity: "warning",
        title: "Ownership conflict detected",
        detail: `"${conflict.entityRef.name}" has different owners in ownerAssignment and ownerPersonId. Using ownerAssignment.`,
        entities: [conflict.entityRef],
        meta: conflictMeta,
      });
    }
  }
}
