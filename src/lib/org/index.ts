/**
 * Org Read Models - Loopbrain Consumption Interface
 * 
 * This is the canonical export surface for Loopbrain to consume Org read models.
 * 
 * Principles:
 * - Only deterministic derivation functions
 * - No UI helpers or components
 * - No mutation functions
 * - Stable API contract (v1)
 * 
 * See docs/org/ORG_LOOPBRAIN_CONSUMPTION.md for consumption contract.
 */

// Completeness derivation
export { deriveCompleteness, type OrgCompleteness } from "./deriveCompleteness";

// Issues derivation
export { deriveIssues, type OrgIssue, type PersonIssues } from "./deriveIssues";

// Capacity derivations
export { deriveEffectiveCapacity } from "./deriveEffectiveCapacity";
export { deriveTeamCapacity, type TeamCapacityRow } from "./rollups/deriveTeamCapacity";
export { deriveCurrentAvailability, type AvailabilityWindow } from "./deriveAvailability";
export { activeAllocationsAt, sumAllocationFraction, type AllocationWindow } from "./deriveAllocations";

// Accountability derivation
export { deriveProjectAccountability, type ProjectAccountabilityReadModel, type AccountabilityValue } from "./deriveProjectAccountability";

// Role profile derivation
export { deriveRoleProfile, type RoleProfile } from "./deriveRoleProfile";

// Role alignment derivation
export { deriveRoleAlignment, type RoleAlignmentResult } from "./deriveRoleAlignment";

// Accountability helpers (types only, no logic)
export type { AccountabilityTarget } from "./accountability";

