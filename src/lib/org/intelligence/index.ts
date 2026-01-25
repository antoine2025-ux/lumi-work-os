/**
 * Org Intelligence Module
 *
 * Phase 5: Central exports for org intelligence computation and integration
 * Phase S: Canonical resolver layer for deterministic signals
 *
 * TODO (Post Phase S Rollout):
 * After Phase S is fully deployed and consumers migrated:
 * 1. Update all imports to use "./snapshotTypes" directly
 * 2. Remove backward-compat re-exports below
 * 3. Keep only getOrgIntelligenceSnapshot/DTO and resolvers in this file
 *
 * New code SHOULD import from "./snapshotTypes" directly.
 */

// ============================================================================
// Phase S: Canonical Resolver Layer (NEW)
// ============================================================================

import { loadIntelligenceData } from "./queries";
import {
  resolveStructureSignals,
  resolveOwnershipSignals,
  resolvePeopleSignals,
  resolveCapacitySignals,
} from "./resolvers";
import type {
  OrgIntelligenceSnapshot,
  OrgIntelligenceSnapshotDTO,
  SnapshotOptions,
  StructureSignals,
  OwnershipSignals,
  PeopleSignals,
  CapacitySignals,
  Severity,
  EntityRef,
  ExplainableIssue,
  OwnershipSource,
  EntityOwnershipState,
  OwnershipConflictMeta,
  AggregatedIssueMeta,
  LandingSeverity,
  SnapshotMeta,
  SnapshotMetaDTO,
  EntityKeyFormat,
  LowercaseEntityType,
  UppercaseEntityType,
  CanonicalIssueCode,
  OrgSnapshotIssueCode,
} from "./snapshotTypes";
import {
  serializeSnapshot,
  createSnapshotMeta,
  createEntityRef,
  createEntityKey,
  normalizeEntityTypeFromDB,
  mapSeverityToLanding,
  ORG_SNAPSHOT_SCHEMA_VERSION,
  ORG_SNAPSHOT_SEMANTICS_VERSION,
  SNAPSHOT_DATA_ASSUMPTIONS,
  SNAPSHOT_API_VERSION,
  SNAPSHOT_ASSUMPTIONS_ID,
  ISSUE_AGGREGATION_THRESHOLD,
  ISSUE_PREVIEW_COUNT,
  ORG_SNAPSHOT_ISSUE_CODES,
  ORG_SNAPSHOT_ISSUE_CODES_SET,
  createIssue,
  // Deprecated: use new names above
  CANONICAL_ISSUE_CODES,
  CANONICAL_ISSUE_CODES_SET,
} from "./snapshotTypes";

// ============================================================================
// Backward-compat re-exports (TODO: remove after Phase S rollout)
// New code should import from "./snapshotTypes" directly
// ============================================================================

// Re-export types
export type {
  OrgIntelligenceSnapshot,
  OrgIntelligenceSnapshotDTO,
  SnapshotOptions,
  StructureSignals,
  OwnershipSignals,
  PeopleSignals,
  CapacitySignals,
  Severity,
  EntityRef,
  ExplainableIssue,
  OwnershipSource,
  EntityOwnershipState,
  OwnershipConflictMeta,
  AggregatedIssueMeta,
  LandingSeverity,
  SnapshotMeta,
  SnapshotMetaDTO,
  EntityKeyFormat,
  LowercaseEntityType,
  UppercaseEntityType,
  CanonicalIssueCode,
  OrgSnapshotIssueCode,
};

// Re-export utilities and constants
export {
  serializeSnapshot,
  createSnapshotMeta,
  createEntityRef,
  createEntityKey,
  normalizeEntityTypeFromDB,
  mapSeverityToLanding,
  ORG_SNAPSHOT_SCHEMA_VERSION,
  ORG_SNAPSHOT_SEMANTICS_VERSION,
  SNAPSHOT_DATA_ASSUMPTIONS,
  SNAPSHOT_API_VERSION,
  SNAPSHOT_ASSUMPTIONS_ID,
  ISSUE_AGGREGATION_THRESHOLD,
  ISSUE_PREVIEW_COUNT,
  ORG_SNAPSHOT_ISSUE_CODES,
  ORG_SNAPSHOT_ISSUE_CODES_SET,
  createIssue,
  // Deprecated: use new names above
  CANONICAL_ISSUE_CODES,
  CANONICAL_ISSUE_CODES_SET,
};

// Re-export resolvers for direct use
export {
  resolveStructureSignals,
  resolveOwnershipSignals,
  resolvePeopleSignals,
  resolveCapacitySignals,
};

// Re-export query function (server-side only)
export { loadIntelligenceData };

/**
 * Get org intelligence snapshot with optional section filtering.
 *
 * SECURITY: workspaceId must come from authenticated session.
 * This function should only be called server-side after auth validation.
 *
 * @param workspaceId - Authenticated workspace ID
 * @param options - Optional section filtering
 * @returns Intelligence snapshot (internal type with Date)
 */
export async function getOrgIntelligenceSnapshot(
  workspaceId: string,
  options?: SnapshotOptions
): Promise<OrgIntelligenceSnapshot> {
  // Load data once
  const data = await loadIntelligenceData(workspaceId);

  // Default: include all sections
  const include = options?.include ?? {
    structure: true,
    ownership: true,
    people: true,
    capacity: true,
  };

  // Build snapshot with requested sections
  const snapshot: OrgIntelligenceSnapshot = {
    _meta: createSnapshotMeta(),
  };

  if (include.structure) {
    snapshot.structure = resolveStructureSignals(data);
  }

  if (include.ownership) {
    snapshot.ownership = resolveOwnershipSignals(data);
  }

  if (include.people) {
    snapshot.people = resolvePeopleSignals(data);
  }

  if (include.capacity) {
    snapshot.capacity = resolveCapacitySignals(data);
  }

  return snapshot;
}

/**
 * Get org intelligence snapshot as API-safe DTO.
 * Converts Date to ISO string for JSON serialization.
 *
 * @param workspaceId - Authenticated workspace ID
 * @param options - Optional section filtering
 * @returns Intelligence snapshot DTO (with string dates)
 */
export async function getOrgIntelligenceSnapshotDTO(
  workspaceId: string,
  options?: SnapshotOptions
): Promise<OrgIntelligenceSnapshotDTO> {
  const snapshot = await getOrgIntelligenceSnapshot(workspaceId, options);
  return serializeSnapshot(snapshot);
}

// ============================================================================
// Phase 5: Legacy Exports (DEPRECATED - will be removed after Phase S migration)
// ============================================================================

export {
  computeOrgIntelligence,
  saveIntelligenceSnapshot,
  getLatestIntelligenceSnapshot,
  type OrgIntelligenceResult,
  type OrgIntelligenceSummary,
  type IntelligenceThresholds,
} from "./computeOrgIntelligence";

export {
  getOrgIntelligenceContext,
  buildIntelligencePromptSection,
  enrichOrgContextWithIntelligence,
  getSignalsForEntity,
  getSignalsByType,
  hasCriticalIssues,
  getActionableSummary,
  type OrgIntelligenceContext,
} from "./orgIntelligenceContext";

