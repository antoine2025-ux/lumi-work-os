/**
 * Capacity Thresholds
 * 
 * Phase G: Explicit defaults, always returned in responses.
 * Settings IA: Workspace-scoped configurable thresholds via OrgCapacitySettings.
 */

import { prisma } from "@/lib/db";

/**
 * Capacity threshold configuration
 */
export type CapacityThresholds = {
  /** Hours below which capacity is considered "low" */
  lowCapacityHoursThreshold: number;
  /** Allocation percent above which person is "overallocated" (1.0 = 100%) */
  overallocationThreshold: number;
  /** Minimum hours for a secondary to be considered viable for coverage */
  minCapacityForCoverage: number;
};

/**
 * Extended thresholds including issue window days
 */
export type CapacityThresholdsWithWindow = CapacityThresholds & {
  issueWindowDays: number;
};

/**
 * Default issue window configuration
 */
export type IssueWindow = {
  start: Date;
  end: Date;
  label: string;
};

/**
 * Default issue window days (7 days forward)
 */
export const DEFAULT_ISSUE_WINDOW_DAYS = 7;

/**
 * Default thresholds (explicit, not magic numbers)
 * 
 * These defaults are always returned in API responses so the system
 * can explain why an issue was triggered.
 */
export const DEFAULT_CAPACITY_THRESHOLDS: CapacityThresholds = {
  lowCapacityHoursThreshold: 8,       // hours
  overallocationThreshold: 1.0,        // 100%
  minCapacityForCoverage: 8,           // hours
};

export const DEFAULT_CAPACITY_THRESHOLDS_WITH_WINDOW: CapacityThresholdsWithWindow = {
  ...DEFAULT_CAPACITY_THRESHOLDS,
  issueWindowDays: DEFAULT_ISSUE_WINDOW_DAYS,
};

/**
 * Get thresholds for a workspace (sync version - returns defaults)
 * 
 * Use this in hot paths where async is not possible.
 * For DB-backed thresholds, use getWorkspaceThresholdsAsync.
 */
export function getWorkspaceThresholds(_workspaceId: string): CapacityThresholds {
  return DEFAULT_CAPACITY_THRESHOLDS;
}

/**
 * Get thresholds for a workspace (async version - DB backed with defaults fallback)
 */
export async function getWorkspaceThresholdsAsync(
  workspaceId: string
): Promise<CapacityThresholdsWithWindow> {
  try {
    const settings = await prisma.orgCapacitySettings.findUnique({
      where: { workspaceId },
    });

    if (settings) {
      return {
        lowCapacityHoursThreshold: settings.lowCapacityHoursThreshold,
        overallocationThreshold: settings.overallocationThreshold,
        minCapacityForCoverage: settings.minCapacityForCoverage,
        issueWindowDays: settings.issueWindowDays,
      };
    }
  } catch {
    // If model doesn't exist yet (pre-migration), fall back to defaults
  }

  return DEFAULT_CAPACITY_THRESHOLDS_WITH_WINDOW;
}

/**
 * Save thresholds for a workspace (upsert)
 */
export async function saveWorkspaceThresholds(
  workspaceId: string,
  thresholds: Partial<CapacityThresholdsWithWindow>
): Promise<CapacityThresholdsWithWindow> {
  const settings = await prisma.orgCapacitySettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      lowCapacityHoursThreshold: thresholds.lowCapacityHoursThreshold ?? DEFAULT_CAPACITY_THRESHOLDS.lowCapacityHoursThreshold,
      overallocationThreshold: thresholds.overallocationThreshold ?? DEFAULT_CAPACITY_THRESHOLDS.overallocationThreshold,
      minCapacityForCoverage: thresholds.minCapacityForCoverage ?? DEFAULT_CAPACITY_THRESHOLDS.minCapacityForCoverage,
      issueWindowDays: thresholds.issueWindowDays ?? DEFAULT_ISSUE_WINDOW_DAYS,
    },
    update: {
      ...(thresholds.lowCapacityHoursThreshold !== undefined && {
        lowCapacityHoursThreshold: thresholds.lowCapacityHoursThreshold,
      }),
      ...(thresholds.overallocationThreshold !== undefined && {
        overallocationThreshold: thresholds.overallocationThreshold,
      }),
      ...(thresholds.minCapacityForCoverage !== undefined && {
        minCapacityForCoverage: thresholds.minCapacityForCoverage,
      }),
      ...(thresholds.issueWindowDays !== undefined && {
        issueWindowDays: thresholds.issueWindowDays,
      }),
    },
  });

  return {
    lowCapacityHoursThreshold: settings.lowCapacityHoursThreshold,
    overallocationThreshold: settings.overallocationThreshold,
    minCapacityForCoverage: settings.minCapacityForCoverage,
    issueWindowDays: settings.issueWindowDays,
  };
}

/**
 * Format threshold for human-readable explanation
 */
export function formatThresholdExplanation(
  type: 'low_capacity' | 'overallocation' | 'coverage_viability',
  thresholds: CapacityThresholds
): string {
  switch (type) {
    case 'low_capacity':
      return `below threshold (${thresholds.lowCapacityHoursThreshold}h)`;
    case 'overallocation':
      return `exceeds threshold (${Math.round(thresholds.overallocationThreshold * 100)}%)`;
    case 'coverage_viability':
      return `requires at least ${thresholds.minCapacityForCoverage}h available`;
    default:
      return '';
  }
}

/**
 * Get default issue window (now → now + 7 days)
 * 
 * This is the canonical window used for Org issues derivation.
 * All surfaces (Issues hub, Overview signals, APIs) must use this.
 */
export function getDefaultIssueWindow(): IssueWindow {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + DEFAULT_ISSUE_WINDOW_DAYS);
  
  return {
    start: now,
    end,
    label: `Next ${DEFAULT_ISSUE_WINDOW_DAYS} days`,
  };
}

/**
 * Serialize issue window for API responses
 */
export function serializeIssueWindow(window: IssueWindow): {
  start: string;
  end: string;
  label: string;
} {
  return {
    start: window.start.toISOString(),
    end: window.end.toISOString(),
    label: window.label,
  };
}

// ============================================================================
// Response Metadata
// ============================================================================

/**
 * Evidence version — shape/schema of evidence payloads (fields)
 * Increment when evidence payload structure changes (adding/removing/renaming fields)
 */
export const EVIDENCE_VERSION = 1;

/**
 * Semantics version — meaning of computations/assumptions
 * Increment when computation logic changes (e.g., switching from min to weighted availability)
 * Can change independently of evidence version
 */
export const SEMANTICS_VERSION = 1;

/**
 * Data assumptions used in capacity computations
 * These are explicitly declared for LoopBrain consistency and debugging
 */
export const CAPACITY_DATA_ASSUMPTIONS = [
  "minAvailabilityInWindow",      // Uses minimum availability factor (conservative)
  "allocationsClippedToWindow",   // Allocations are clipped to window boundaries
  "contractScaledByWindowDays",   // contractedHours = weeklyHours × (windowDays/7)
  "manualOverridesIntegration",   // MANUAL availability events override INTEGRATION
] as const;

export const COVERAGE_DATA_ASSUMPTIONS = [
  ...CAPACITY_DATA_ASSUMPTIONS,
  "candidatesRankedByViabilityThenHours", // Viable first, then by effectiveAvailableHours
  "deterministicTieBreaker",              // personId used for stable ordering
] as const;

/**
 * Response metadata for capacity/coverage APIs
 * 
 * Helps with:
 * - Future debugging (generatedAt timestamp)
 * - LoopBrain prompt consistency (dataAssumptions, assumptionsId)
 * - Avoiding silent semantic drift (evidenceVersion, semanticsVersion)
 */
export type ResponseMeta = {
  generatedAt: string;
  /** Stable identifier for the assumptions set (e.g., "capacity:v1") */
  assumptionsId: string;
  dataAssumptions: readonly string[];
  /** Schema version of evidence payloads */
  evidenceVersion: number;
  /** Version of computation logic/semantics */
  semanticsVersion: number;
};

/**
 * Generate response metadata for capacity APIs
 */
export function getCapacityResponseMeta(): ResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `capacity:v${SEMANTICS_VERSION}`,
    dataAssumptions: CAPACITY_DATA_ASSUMPTIONS,
    evidenceVersion: EVIDENCE_VERSION,
    semanticsVersion: SEMANTICS_VERSION,
  };
}

/**
 * Generate response metadata for coverage APIs
 */
export function getCoverageResponseMeta(): ResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `coverage:v${SEMANTICS_VERSION}`,
    dataAssumptions: COVERAGE_DATA_ASSUMPTIONS,
    evidenceVersion: EVIDENCE_VERSION,
    semanticsVersion: SEMANTICS_VERSION,
  };
}
