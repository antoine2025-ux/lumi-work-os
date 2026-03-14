/**
 * Capacity Status Module
 *
 * Capacity v1: Single source of truth for person and team capacity status.
 *
 * Status precedence (highest wins):
 * SEVERELY_OVERLOADED > OVERLOADED > ZERO_AVAILABLE / NO_CAPACITY >
 * UNDERUTILIZED > MISSING / MISSING_DATA > OK
 *
 * Invariant: No UI surface or API endpoint may compute status outside this module.
 */

import type { EffectiveCapacity } from "./resolveEffectiveCapacity";
import type { CapacityThresholds } from "./thresholds";

// ============================================================================
// Status Types
// ============================================================================

export type PersonCapacityStatus =
  | "MISSING"
  | "OK"
  | "AT_RISK"
  | "OVERLOADED"
  | "SEVERELY_OVERLOADED"
  | "UNDERUTILIZED"
  | "ZERO_AVAILABLE";

export type TeamCapacityStatus =
  | "MISSING_DATA"
  | "OK"
  | "OVERLOADED"
  | "SEVERELY_OVERLOADED"
  | "UNDERUTILIZED"
  | "NO_CAPACITY";

// ============================================================================
// UI Mapping
// ============================================================================

export type StatusSeverity = "critical" | "warning" | "info" | "success";

export type StatusUI = {
  severity: StatusSeverity;
  color: string;
  label: string;
};

/**
 * Canonical severity-to-UI mapping.
 * All surfaces (People, Structure, Intelligence, Issues) must use this.
 */
export const STATUS_UI_MAP: Record<PersonCapacityStatus | TeamCapacityStatus, StatusUI> = {
  SEVERELY_OVERLOADED: { severity: "critical", color: "red", label: "Severely Overloaded" },
  OVERLOADED: { severity: "warning", color: "orange", label: "Overloaded" },
  AT_RISK: { severity: "warning", color: "amber", label: "At Risk" },
  ZERO_AVAILABLE: { severity: "warning", color: "red", label: "Zero Availability" },
  NO_CAPACITY: { severity: "warning", color: "red", label: "No Capacity" },
  UNDERUTILIZED: { severity: "info", color: "yellow", label: "Underutilized" },
  MISSING: { severity: "warning", color: "gray", label: "No Data" },
  MISSING_DATA: { severity: "warning", color: "gray", label: "Missing Data" },
  OK: { severity: "success", color: "green", label: "OK" },
};

// ============================================================================
// Person Status
// ============================================================================

/**
 * Metadata about a person's capacity data completeness.
 * Used alongside EffectiveCapacity to determine MISSING status.
 *
 * contractResolution.isDefault === true means the resolver fell back to
 * defaultWeeklyHoursTarget rather than an explicit CapacityContract.
 * This represents *inferred* data, not *configured* data.
 */
export type PersonCapacityMeta = {
  /** true when no explicit CapacityContract exists */
  isContractDefault: boolean;
  /** true when PersonAvailability records exist for the window */
  hasAvailabilityData: boolean;
};

/**
 * Determine a person's capacity status from resolver output + metadata.
 *
 * Precedence:
 * 1. MISSING — no configured data at all
 * 2. ZERO_AVAILABLE — availability is zero
 * 3. SEVERELY_OVERLOADED — utilization >= severeOverloadThresholdPct
 * 4. OVERLOADED — utilization >= overallocationThreshold
 * 5. UNDERUTILIZED — utilization <= underutilizedThresholdPct
 * 6. OK
 */
export function getPersonCapacityStatus(
  capacity: EffectiveCapacity,
  meta: PersonCapacityMeta,
  settings: CapacityThresholds
): PersonCapacityStatus {
  // Missing: no contract AND no availability data → all inferred
  if (meta.isContractDefault && !meta.hasAvailabilityData) {
    return "MISSING";
  }

  // Zero available hours (e.g. on leave or 0h contract)
  if (capacity.availabilityFactor === 0 || capacity.contractedHoursForWindow <= 0) {
    return "ZERO_AVAILABLE";
  }

  // Compute utilization ratio
  const availableHours = capacity.contractedHoursForWindow * capacity.availabilityFactor;
  const utilizationPct = availableHours > 0
    ? capacity.allocatedHours / availableHours
    : (capacity.allocatedHours > 0 ? Infinity : 0);

  // Precedence: severe > overloaded > underutilized > ok
  if (utilizationPct >= settings.severeOverloadThresholdPct) {
    return "SEVERELY_OVERLOADED";
  }
  if (utilizationPct >= settings.overallocationThreshold) {
    return "OVERLOADED";
  }
  if (utilizationPct <= settings.underutilizedThresholdPct) {
    return "UNDERUTILIZED";
  }
  return "OK";
}

// ============================================================================
// Team Rollup Types
// ============================================================================

export type TeamCapacityRollup = {
  teamId: string;
  teamName: string;
  departmentId: string | null;
  memberCount: number;
  /** Total effective available hours across members (contractedHours * availabilityFactor) */
  availableHours: number;
  /** Total allocated hours across members */
  allocatedHours: number;
  /** Team utilization: allocatedHours / availableHours (0-N) */
  utilizationPct: number;
  /** Number of members missing capacity data */
  missingDataCount: number;
  /** Demand from TeamCapacityPlan (null if no plan exists) */
  weeklyDemandHours: number | null;
  /** availableHours - weeklyDemandHours (null if no demand plan) */
  demandGapHours: number | null;
};

/**
 * Determine a team's capacity status from rollup data.
 *
 * Distinction:
 * - CAPACITY_TEAM_NO_MEMBERS: zero active OrgPositions with users (Structure problem)
 * - NO_CAPACITY: has members but total availableHours === 0 (Capacity problem)
 * - MISSING_DATA: any member is missing capacity data (partial rollup)
 *
 * Precedence: SEVERELY_OVERLOADED > OVERLOADED > NO_CAPACITY > UNDERUTILIZED > MISSING_DATA > OK
 */
export function getTeamCapacityStatus(
  rollup: TeamCapacityRollup,
  settings: CapacityThresholds
): TeamCapacityStatus {
  // No members at all → reported via issue, not via team status badge
  // (the team card itself would show "0 members")
  if (rollup.memberCount === 0) {
    return "MISSING_DATA";
  }

  // All members available but total is zero
  if (rollup.availableHours === 0) {
    return "NO_CAPACITY";
  }

  // Compute utilization
  const utilizationPct = rollup.utilizationPct;

  if (utilizationPct >= settings.severeOverloadThresholdPct) {
    return "SEVERELY_OVERLOADED";
  }
  if (utilizationPct >= settings.overallocationThreshold) {
    return "OVERLOADED";
  }

  // NO_CAPACITY check already done above (availableHours === 0)

  if (utilizationPct <= settings.underutilizedThresholdPct && rollup.memberCount > 0) {
    return "UNDERUTILIZED";
  }

  // Any member missing data → team data is unreliable
  if (rollup.missingDataCount > 0) {
    return "MISSING_DATA";
  }

  return "OK";
}

/**
 * Get the StatusUI for any person or team capacity status.
 */
export function getStatusUI(status: PersonCapacityStatus | TeamCapacityStatus): StatusUI {
  return STATUS_UI_MAP[status];
}

// ============================================================================
// V2: Snapshot-Based Status (capacity calculation contract v1.0 §6)
// ============================================================================

/**
 * 5-tier capacity status for weekly snapshots.
 * Used by PersonCapacity.snapshotStatus field.
 *
 * Mapping from contract §6:
 * - OVERALLOCATED: > 100% (overallocationThreshold)
 * - AT_RISK: 85-100% (thresholdAtRisk to overallocationThreshold)
 * - HEALTHY: 40-84% (underutilizedThresholdPct to thresholdAtRisk)
 * - UNDERUTILIZED: < 40% (below underutilizedThresholdPct)
 * - UNAVAILABLE: effectiveHours ≤ 0
 */
export type CapacitySnapshotStatus =
  | "OVERALLOCATED"
  | "AT_RISK"
  | "HEALTHY"
  | "UNDERUTILIZED"
  | "UNAVAILABLE";

/** Thresholds for V2 status derivation (all in percentage 0-100) */
export type CapacitySnapshotThresholds = {
  overallocationThreshold: number; // Default 100
  thresholdAtRisk: number; // Default 85
  underutilizedThresholdPct: number; // Default 40
};

/** Default thresholds matching contract §6 */
export const DEFAULT_SNAPSHOT_THRESHOLDS: CapacitySnapshotThresholds = {
  overallocationThreshold: 100,
  thresholdAtRisk: 85,
  underutilizedThresholdPct: 40,
};

/**
 * Derive capacity snapshot status from utilization percentage.
 *
 * Contract §6 five-tier system:
 * 1. UNAVAILABLE: effectiveHours ≤ 0
 * 2. OVERALLOCATED: utilization > overallocationThreshold (100%)
 * 3. AT_RISK: utilization > thresholdAtRisk (85%) AND ≤ overallocationThreshold
 * 4. HEALTHY: utilization ≥ underutilizedThresholdPct (40%) AND ≤ thresholdAtRisk
 * 5. UNDERUTILIZED: utilization < underutilizedThresholdPct (40%)
 */
export function getPersonCapacityStatusV2(
  utilization: number | null,
  effectiveHours: number,
  thresholds: CapacitySnapshotThresholds = DEFAULT_SNAPSHOT_THRESHOLDS
): CapacitySnapshotStatus {
  // No effective hours available
  if (effectiveHours <= 0) {
    return "UNAVAILABLE";
  }

  // No utilization data (no tasks, no allocations)
  if (utilization == null) {
    return "UNDERUTILIZED"; // 0% utilization = underutilized
  }

  if (utilization > thresholds.overallocationThreshold) {
    return "OVERALLOCATED";
  }
  if (utilization > thresholds.thresholdAtRisk) {
    return "AT_RISK";
  }
  if (utilization < thresholds.underutilizedThresholdPct) {
    return "UNDERUTILIZED";
  }
  return "HEALTHY";
}
