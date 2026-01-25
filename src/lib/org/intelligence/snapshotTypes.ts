/**
 * Phase S: Org Intelligence Snapshot Types
 *
 * ISOLATED from landing types to prevent circular dependencies.
 * Resolvers import from here; landing types remain in types.ts.
 *
 * Schema version and determinism rules are documented here.
 */

// ============================================================================
// Versioning
// ============================================================================

/**
 * Schema version for OrgIntelligenceSnapshot DTO shape.
 *
 * INCREMENT POLICY (schemaVersion):
 * - Increment when DTO shape changes (fields added/removed/renamed)
 * - Increment when type of existing field changes
 * - Do NOT increment for bug fixes that don't change shape
 * - Do NOT increment for semantics changes (use semanticsVersion)
 *
 * Used by consumers to detect breaking changes and migrate.
 */
export const ORG_SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * Semantics version for resolver behavior and issue interpretation.
 *
 * INCREMENT POLICY (semanticsVersion):
 * - Increment when issue aggregation thresholds change
 * - Increment when coverage calculation logic changes
 * - Increment when issue code semantics change
 * - Increment when issue codes are added/renamed/removed
 * - Do NOT increment for DTO shape changes (use schemaVersion)
 *
 * Current semantics (v1):
 * - ISSUE_AGGREGATION_THRESHOLD = 5
 * - ISSUE_PREVIEW_COUNT = 3
 * - Coverage uses Math.floor for conservative reporting
 * - OWNERSHIP_CONFLICT split into OWNERSHIP_CONFLICT_TEAM / _DEPARTMENT
 */
export const ORG_SNAPSHOT_SEMANTICS_VERSION = 1;

/**
 * API version query param relationship.
 *
 * RULE: ?version=v2 implies:
 * - Stable DTO envelope (schemaVersion 1+)
 * - Phase S resolver semantics (semanticsVersion 1+)
 *
 * When schemaVersion increments, consider adding ?version=v3.
 * When semanticsVersion increments without schema change, v2 remains stable
 * but consumers should check semanticsVersion in _meta for behavior changes.
 */
export const SNAPSHOT_API_VERSION = "v2";

// ============================================================================
// Aggregation Constants
// ============================================================================

/**
 * Threshold for switching from per-entity issues to summary issue.
 * If unowned/conflict count > threshold, emit single aggregated issue.
 *
 * IMPORTANT: Changes to this value require incrementing OWNERSHIP_SEMANTICS_VERSION.
 */
export const ISSUE_AGGREGATION_THRESHOLD = 5;

/**
 * Number of entities to include in aggregated issue preview.
 * These appear in the `entities` field of aggregated issues.
 *
 * IMPORTANT: Changes to this value require incrementing OWNERSHIP_SEMANTICS_VERSION.
 */
export const ISSUE_PREVIEW_COUNT = 3;

// ============================================================================
// Key Format Constants
// ============================================================================

/**
 * Lowercase entity type for internal state.
 * All internal code MUST use lowercase. Uppercase only at DB/query edge.
 */
export type LowercaseEntityType = "team" | "department";

/**
 * Uppercase entity type as stored in DB (OwnerAssignment.entityType).
 */
export type UppercaseEntityType = "TEAM" | "DEPARTMENT";

/**
 * Key format for ownershipByEntity and ownerAssignments maps.
 *
 * Format: "${entityType}:${entityId}"
 * - entityType is LOWERCASE: "team" | "department"
 * - entityId is the entity's UUID
 *
 * Examples:
 * - "team:abc123-def456"
 * - "department:xyz789-uvw012"
 *
 * IMPORTANT: This format must be consistent across:
 * - ownershipByEntity keys (OwnershipSignals)
 * - ownerAssignments map keys (resolver internal)
 * - Any future lookups
 */
export type EntityKeyFormat = `${LowercaseEntityType}:${string}`;

/**
 * Normalize DB entity type to lowercase for internal use.
 * Use this at the query/DB edge only.
 *
 * @param dbEntityType - Uppercase type from DB (e.g., "TEAM", "DEPARTMENT")
 * @returns Lowercase type for internal use, or null if unknown
 */
export function normalizeEntityTypeFromDB(
  dbEntityType: string
): LowercaseEntityType | null {
  const upper = dbEntityType.toUpperCase();
  if (upper === "TEAM" || upper === "ORGTEAM") return "team";
  if (upper === "DEPARTMENT" || upper === "ORGDEPARTMENT") return "department";
  return null;
}

/**
 * Create a canonical entity key for ownership lookups.
 * STRICT: Only accepts lowercase entity types.
 *
 * Use normalizeEntityTypeFromDB() at the query edge if you have uppercase input.
 */
export function createEntityKey(
  entityType: LowercaseEntityType,
  entityId: string
): EntityKeyFormat {
  return `${entityType}:${entityId}`;
}

// ============================================================================
// Phase S Data Assumptions
// ============================================================================

/**
 * Data assumptions for Phase S snapshot resolvers.
 * Explicitly declared for LoopBrain consistency and debugging.
 *
 * These complement INTELLIGENCE_DATA_ASSUMPTIONS in types.ts.
 */
export const SNAPSHOT_DATA_ASSUMPTIONS = [
  /** workspaceId MUST come from authenticated session, never from query params */
  "workspaceIdFromAuthOnly",
  /** Same DB state produces same output (excluding _meta.computedAt) */
  "snapshotDeterministicExcludingMeta",
  /** OwnerAssignment is authoritative over entity.ownerPersonId */
  "ownerAssignmentAuthoritative",
  /** OrgPosition.parentId takes precedence over PersonManagerLink */
  "managerPrecedencePositionOverLink",
  /** Unassigned teams (departmentId=null) excluded from ownership coverage */
  "unassignedTeamsExcludedFromCoverage",
  /** Coverage percentages use Math.floor for conservative reporting */
  "coverageUsesFloor",
] as const;

export type SnapshotDataAssumption = (typeof SNAPSHOT_DATA_ASSUMPTIONS)[number];

// ============================================================================
// Canonical Issue Codes
// ============================================================================

/**
 * Canonical issue codes for Phase S snapshot resolvers.
 *
 * SINGLE SOURCE OF TRUTH for all issue codes.
 * - Prevents typos like OWNERSHIP_UNOWNED_TEAMS (plural)
 * - Use OrgSnapshotIssueCode type in ExplainableIssue
 * - Use ORG_SNAPSHOT_ISSUE_CODES_SET for runtime validation
 *
 * See docs/org/intelligence-rules.md for descriptions.
 */
export const ORG_SNAPSHOT_ISSUE_CODES = [
  // Ownership
  "OWNERSHIP_UNOWNED_TEAM",
  "OWNERSHIP_UNOWNED_DEPARTMENT",
  "OWNERSHIP_CONFLICT_TEAM",
  "OWNERSHIP_CONFLICT_DEPARTMENT",
  "OWNERSHIP_UNKNOWN_ENTITY_TYPE",
  "OWNERSHIP_COVERAGE_INCLUDES_EMPTY_DEPARTMENTS",

  // Structure
  "STRUCTURE_EMPTY_DEPARTMENT",
  "STRUCTURE_UNASSIGNED_TEAM",
  "STRUCTURE_TEAM_PERSON_RELATION_NOT_MODELED",
  "STRUCTURE_MISSING_ENTITY_NAME",

  // People
  "PEOPLE_MULTIPLE_ROOTS",
  "PEOPLE_MANAGER_LINK_CONFLICT",
  "PEOPLE_MISSING_MANAGER",

  // Capacity
  "CAPACITY_NOT_MODELED",
] as const;

/**
 * Type-safe issue code. Use this instead of string.
 */
export type OrgSnapshotIssueCode = (typeof ORG_SNAPSHOT_ISSUE_CODES)[number];

/**
 * Set of all canonical issue codes for runtime validation.
 */
export const ORG_SNAPSHOT_ISSUE_CODES_SET = new Set<string>(ORG_SNAPSHOT_ISSUE_CODES);

/**
 * @deprecated Use ORG_SNAPSHOT_ISSUE_CODES instead. Kept for backward compat.
 */
export const CANONICAL_ISSUE_CODES = {
  OWNERSHIP_UNOWNED_TEAM: "OWNERSHIP_UNOWNED_TEAM",
  OWNERSHIP_UNOWNED_DEPARTMENT: "OWNERSHIP_UNOWNED_DEPARTMENT",
  OWNERSHIP_CONFLICT_TEAM: "OWNERSHIP_CONFLICT_TEAM",
  OWNERSHIP_CONFLICT_DEPARTMENT: "OWNERSHIP_CONFLICT_DEPARTMENT",
  OWNERSHIP_UNKNOWN_ENTITY_TYPE: "OWNERSHIP_UNKNOWN_ENTITY_TYPE",
  OWNERSHIP_COVERAGE_INCLUDES_EMPTY_DEPARTMENTS: "OWNERSHIP_COVERAGE_INCLUDES_EMPTY_DEPARTMENTS",
  STRUCTURE_EMPTY_DEPARTMENT: "STRUCTURE_EMPTY_DEPARTMENT",
  STRUCTURE_UNASSIGNED_TEAM: "STRUCTURE_UNASSIGNED_TEAM",
  STRUCTURE_TEAM_PERSON_RELATION_NOT_MODELED: "STRUCTURE_TEAM_PERSON_RELATION_NOT_MODELED",
  STRUCTURE_MISSING_ENTITY_NAME: "STRUCTURE_MISSING_ENTITY_NAME",
  PEOPLE_MULTIPLE_ROOTS: "PEOPLE_MULTIPLE_ROOTS",
  PEOPLE_MANAGER_LINK_CONFLICT: "PEOPLE_MANAGER_LINK_CONFLICT",
  PEOPLE_MISSING_MANAGER: "PEOPLE_MISSING_MANAGER",
  CAPACITY_NOT_MODELED: "CAPACITY_NOT_MODELED",
} as const satisfies Record<string, OrgSnapshotIssueCode>;

/** @deprecated Use OrgSnapshotIssueCode instead */
export type CanonicalIssueCode = OrgSnapshotIssueCode;

/** @deprecated Use ORG_SNAPSHOT_ISSUE_CODES_SET instead */
export const CANONICAL_ISSUE_CODES_SET = ORG_SNAPSHOT_ISSUE_CODES_SET;

// ============================================================================
// Severity Types
// ============================================================================

/**
 * Severity levels for explainable issues.
 *
 * BRIDGE TO LANDING TYPES:
 * - Phase S "critical" maps to landing "error" (SectionSummary.critical)
 * - Use mapSeverityToLanding() when aggregating into landing summaries
 *
 * See docs/org/intelligence-rules.md for definitions.
 */
export type Severity = "none" | "info" | "warning" | "critical";

/**
 * Landing severity for SectionSummary compatibility.
 * Landing uses "error" where Phase S uses "critical".
 */
export type LandingSeverity = "info" | "warning" | "error";

/**
 * Map Phase S severity to landing severity.
 * Use when aggregating snapshot issues into landing summaries.
 */
export function mapSeverityToLanding(severity: Severity): LandingSeverity | null {
  switch (severity) {
    case "critical":
      return "error"; // Phase S "critical" → landing "error"
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "none":
      return null; // "none" doesn't count in landing summaries
  }
}

// ============================================================================
// Entity Reference
// ============================================================================

/**
 * EntityRef.type scope for Phase S:
 * - "department", "team", "person" are actively used
 * - "position" included ONLY for manager-chain resolution (parentId references)
 * - Position-level issues (ORPHAN_POSITION) remain in deriveIssues.ts
 *
 * NAME RULES (see docs/org/intelligence-rules.md):
 * - For teams/departments: ALWAYS include name (required for UI)
 * - For persons: Include name if available; UIs should fallback to "Unknown" + id suffix
 * - Resolvers must never emit EntityRef with blank/empty name for teams/departments
 */
export type EntityRef = {
  type: "department" | "team" | "person" | "position";
  id: string;
  /**
   * Display name. Required for teams/departments.
   * For persons: include if available, else UI should show fallback.
   */
  name?: string;
};

/**
 * Create an EntityRef with required name for teams/departments.
 * Throws if name is missing for team/department.
 */
export function createEntityRef(
  type: EntityRef["type"],
  id: string,
  name: string | null | undefined
): EntityRef {
  // Teams and departments MUST have names
  if ((type === "team" || type === "department") && !name) {
    // Fallback to "Unknown" with ID suffix for safety
    return { type, id, name: `Unknown ${type} (${id.slice(0, 8)})` };
  }
  return { type, id, name: name ?? undefined };
}

// ============================================================================
// Explainable Issues
// ============================================================================

/**
 * Ownership conflict metadata.
 * Provides full audit trail for conflict resolution.
 */
export type OwnershipConflictMeta = {
  source: "ownerAssignment";
  assignmentOwnerId: string;
  entityOwnerPersonId: string;
  entityType: "team" | "department";
};

/**
 * Aggregated issue metadata.
 * Used when count > threshold to summarize.
 */
export type AggregatedIssueMeta = {
  count: number;
  aggregated: true;
  entityType?: "team" | "department" | "person";
};

/**
 * Explainable issue with stable, namespaced code.
 * Codes follow pattern: {DOMAIN}_{SPECIFIC} (e.g., OWNERSHIP_UNOWNED_TEAM)
 *
 * CODE TYPE SAFETY:
 * - `code` uses OrgSnapshotIssueCode for compile-time typo prevention
 * - All valid codes are in ORG_SNAPSHOT_ISSUE_CODES array
 * - Runtime validation: ORG_SNAPSHOT_ISSUE_CODES_SET.has(code)
 */
export type ExplainableIssue = {
  /** Namespaced code from ORG_SNAPSHOT_ISSUE_CODES */
  code: OrgSnapshotIssueCode;
  severity: Severity;
  title: string;
  detail?: string;
  entities?: EntityRef[];
  /**
   * Extensible metadata for debugging, analytics, and audit trails.
   *
   * Common shapes:
   * - OwnershipConflictMeta: { source, assignmentOwnerId, entityOwnerPersonId, entityType }
   * - AggregatedIssueMeta: { count, aggregated: true, entityType }
   * - Generic: { entityType: "team" | "department" } for filtering
   */
  meta?: Record<string, unknown>;
};

/**
 * Type-safe issue creator.
 *
 * USE THIS instead of creating issues manually:
 * - Prevents typos in issue codes at compile time
 * - Provides autocomplete for valid codes
 * - Ensures all fields are present
 *
 * @example
 * createIssue("OWNERSHIP_UNOWNED_TEAM", "warning", "Team needs owner", {
 *   detail: "...",
 *   entities: [...],
 * })
 */
export function createIssue(
  code: OrgSnapshotIssueCode,
  severity: Severity,
  title: string,
  options?: {
    detail?: string;
    entities?: EntityRef[];
    meta?: Record<string, unknown>;
  }
): ExplainableIssue {
  return {
    code,
    severity,
    title,
    ...(options?.detail && { detail: options.detail }),
    ...(options?.entities && { entities: options.entities }),
    ...(options?.meta && { meta: options.meta }),
  };
}

// ============================================================================
// Section Signals
// ============================================================================

/**
 * Structure signals - organizational hierarchy state
 */
export type StructureSignals = {
  departments: EntityRef[];
  teamsByDepartment: Record<string, EntityRef[]>;
  unassignedTeams: EntityRef[];
  departmentsWithoutTeams: EntityRef[];
  /** Empty array + info issue if team-person relation not modeled */
  teamsWithoutPeople: EntityRef[];
  /** Empty array + info issue if team-person relation not modeled */
  peopleWithoutTeams: EntityRef[];
  issues: ExplainableIssue[];
};

/**
 * Ownership source for an entity
 */
export type OwnershipSource = "ownerAssignment" | "ownerPersonId";

/**
 * Resolved ownership state for an entity.
 *
 * When hasConflict is true, both conflictAssignmentOwnerId and
 * conflictEntityOwnerPersonId are populated for audit trail.
 */
export type EntityOwnershipState = {
  entityType: "team" | "department";
  entityId: string;
  entityName: string;
  /** Resolved owner (from winning source) */
  ownerId: string | null;
  /** Which source provided the resolved owner */
  source: OwnershipSource | null;
  /** True if ownerAssignment and ownerPersonId exist and differ */
  hasConflict: boolean;
  /** Present when hasConflict: owner from OwnerAssignment (winner) */
  conflictAssignmentOwnerId?: string;
  /** Present when hasConflict: owner from entity.ownerPersonId (loser) */
  conflictEntityOwnerPersonId?: string;
};

/**
 * Ownership signals - who owns what
 *
 * Coverage percentages use Math.floor for conservative reporting.
 * This prevents UI churn from rounding (e.g., 66.6% → 66%, not 67%).
 *
 * NOTE: coverage.departments includes ALL departments, even those without teams.
 * This is intentional - ownership is about accountability, not structure.
 * See docs/org/intelligence-rules.md for rationale.
 *
 * DRILLDOWN USAGE:
 * - Ownership drilldowns/tables MUST use `unownedEntities` for per-entity rows
 * - `issues` is for banners/inbox summaries only (may be aggregated)
 * - Never rely on issues.length for entity counts
 *
 * CONFLICTS INVARIANT:
 * - `conflicts[]` is derived from `ownershipByEntity` where `hasConflict === true`
 * - These must always match exactly (enforced by tests)
 *
 * COVERAGE UNIVERSE INVARIANT:
 * - `unownedEntities` contains ONLY entities in coverage universe
 * - Unassigned teams (departmentId=null) are NOT in unownedEntities
 * - Unassigned teams are in `unassignedTeamsExcludedFromCoverage`
 * - INVARIANT: unownedEntities.length === coverage.teams.unowned + coverage.departments.unowned
 * - See docs/org/intelligence-rules.md § Coverage Universe Invariant
 */
export type OwnershipSignals = {
  coverage: {
    teams: { total: number; owned: number; unowned: number; percent: number };
    departments: { total: number; owned: number; unowned: number; percent: number };
    overallPercent: number;
  };
  /**
   * All unowned entities (teams + departments) IN COVERAGE UNIVERSE.
   * Excludes unassigned teams (departmentId=null).
   * Use this for drilldown tables, NOT issues.
   *
   * INVARIANT: length === coverage.teams.unowned + coverage.departments.unowned
   */
  unownedEntities: EntityRef[];
  /**
   * Unassigned teams (departmentId=null) excluded from coverage.
   * These are NOT in unownedEntities - they're a structural issue, not ownership.
   */
  unassignedTeamsExcludedFromCoverage: EntityRef[];
  /**
   * Entities with ownership conflicts (ownerAssignment differs from ownerPersonId).
   * INVARIANT: Derived from ownershipByEntity where hasConflict === true.
   */
  conflicts: EntityRef[];
  /**
   * Per-entity ownership state for debugging/audit.
   *
   * KEY FORMAT: Use createEntityKey() for consistency.
   * Format: "${entityType}:${entityId}" where entityType is lowercase ("team" | "department").
   * Example: "team:abc123-def456", "department:xyz789-uvw012"
   */
  ownershipByEntity: Record<EntityKeyFormat, EntityOwnershipState>;
  /**
   * Issues for banners/inbox summaries.
   * May be aggregated when count > ISSUE_AGGREGATION_THRESHOLD.
   * Do NOT use for entity counts or drilldown tables.
   */
  issues: ExplainableIssue[];
};

/**
 * People signals - manager relationships and load
 */
export type PeopleSignals = {
  peopleWithoutManagers: EntityRef[];
  managerLoad: Array<{ manager: EntityRef; directReports: number }>;
  overloadedManagers: Array<{ manager: EntityRef; directReports: number }>;
  issues: ExplainableIssue[];
};

/**
 * Capacity signals - role distribution and execution capacity
 * Phase S: Stub only, capacity expansion deferred
 */
export type CapacitySignals = {
  roleDistribution: Array<{ role: string; count: number }>;
  teamsWithZeroExecutionCapacity: EntityRef[];
  issues: ExplainableIssue[];
};

// ============================================================================
// Snapshot Types
// ============================================================================

/**
 * Snapshot metadata (NOT part of deterministic output)
 * Internal type - uses Date for computation
 *
 * Includes assumptions for LoopBrain traceability.
 */
export type SnapshotMeta = {
  /** Metadata only; excluded from equality/reasoning */
  computedAt: Date;
  /** DTO shape version - increment when fields change */
  schemaVersion: number;
  /** Resolver behavior version - increment when semantics change */
  semanticsVersion: number;
  /** Assumptions ID for traceability */
  assumptionsId: string;
  /** Data assumptions applied to this snapshot */
  dataAssumptions: readonly string[];
};

/**
 * Main intelligence snapshot (internal)
 * Used by resolvers and server-side code
 */
export type OrgIntelligenceSnapshot = {
  structure?: StructureSignals;
  ownership?: OwnershipSignals;
  people?: PeopleSignals;
  capacity?: CapacitySignals;
  /** Prefixed to signal non-deterministic metadata */
  _meta: SnapshotMeta;
};

/**
 * DTO types for API responses (serialized)
 * computedAt is ISO 8601 string for JSON serialization
 *
 * Includes all metadata for client introspection and LoopBrain traceability.
 */
export type SnapshotMetaDTO = {
  /** ISO 8601 string: "2026-01-24T10:30:00.000Z" */
  computedAt: string;
  /** DTO shape version - increment when fields change */
  schemaVersion: number;
  /** Resolver behavior version - increment when semantics change */
  semanticsVersion: number;
  /** Assumptions ID for traceability (e.g., "org-snapshot:v1") */
  assumptionsId: string;
  /** Data assumptions applied to this snapshot */
  dataAssumptions: readonly string[];
};

/**
 * Snapshot DTO for API responses
 */
export type OrgIntelligenceSnapshotDTO = {
  structure?: StructureSignals;
  ownership?: OwnershipSignals;
  people?: PeopleSignals;
  capacity?: CapacitySignals;
  _meta: SnapshotMetaDTO;
};

/**
 * Options for getOrgIntelligenceSnapshot
 */
export type SnapshotOptions = {
  include?: {
    structure?: boolean;
    ownership?: boolean;
    people?: boolean;
    capacity?: boolean;
  };
};

/**
 * Assumptions ID for org snapshot.
 * Format: "org-snapshot:v{schemaVersion}"
 */
export const SNAPSHOT_ASSUMPTIONS_ID = `org-snapshot:v${ORG_SNAPSHOT_SCHEMA_VERSION}`;

/**
 * Serialize internal snapshot to API-safe DTO.
 *
 * EXPLICIT SHAPE: Does not spread snapshot to prevent accidental
 * leakage of internal fields if snapshot grows.
 */
export function serializeSnapshot(snapshot: OrgIntelligenceSnapshot): OrgIntelligenceSnapshotDTO {
  return {
    // Explicitly list each section (no spread)
    structure: snapshot.structure,
    ownership: snapshot.ownership,
    people: snapshot.people,
    capacity: snapshot.capacity,
    // Serialize _meta with explicit fields
    _meta: {
      computedAt: snapshot._meta.computedAt.toISOString(),
      schemaVersion: snapshot._meta.schemaVersion,
      semanticsVersion: snapshot._meta.semanticsVersion,
      assumptionsId: snapshot._meta.assumptionsId,
      dataAssumptions: snapshot._meta.dataAssumptions,
    },
  };
}

/**
 * Create snapshot metadata with current versions and assumptions.
 */
export function createSnapshotMeta(): SnapshotMeta {
  return {
    computedAt: new Date(),
    schemaVersion: ORG_SNAPSHOT_SCHEMA_VERSION,
    semanticsVersion: ORG_SNAPSHOT_SEMANTICS_VERSION,
    assumptionsId: SNAPSHOT_ASSUMPTIONS_ID,
    dataAssumptions: SNAPSHOT_DATA_ASSUMPTIONS,
  };
}
