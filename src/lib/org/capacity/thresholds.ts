/**
 * Capacity Thresholds
 * 
 * Phase G: Explicit defaults, always returned in responses.
 * Settings IA: Workspace-scoped configurable thresholds via OrgCapacitySettings.
 */

import { prisma } from "@/lib/db";
import type { WorkingHoursConfig } from "./calendar-classification";
import { DEFAULT_WORKING_HOURS } from "./calendar-classification";

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
  /** Capacity v1: Allocation percent above which overload is "severe" (1.4 = 140%) */
  severeOverloadThresholdPct: number;
  /** Capacity v1: Allocation percent below which person is "underutilized" (0.6 = 60%) */
  underutilizedThresholdPct: number;
  /** Capacity v1: Default weekly hours target for quick-entry */
  defaultWeeklyHoursTarget: number;
  /** Capacity calc contract v1.0: At-risk threshold (0.85 = 85%) */
  thresholdAtRisk: number;
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
  severeOverloadThresholdPct: 1.4,     // 140%
  underutilizedThresholdPct: 0.6,      // 60%
  defaultWeeklyHoursTarget: 40,        // hours
  thresholdAtRisk: 0.85,               // 85%
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
        severeOverloadThresholdPct: settings.severeOverloadThresholdPct,
        underutilizedThresholdPct: settings.underutilizedThresholdPct,
        defaultWeeklyHoursTarget: settings.defaultWeeklyHoursTarget,
        thresholdAtRisk: settings.thresholdAtRisk,
      };
    }
  } catch {
    // If model doesn't exist yet (pre-migration), fall back to defaults
  }

  return DEFAULT_CAPACITY_THRESHOLDS_WITH_WINDOW;
}

/**
 * Get working hours configuration for calendar event classification.
 * Reads workingHoursStart/End from OrgCapacitySettings, falls back to defaults.
 */
export async function getWorkingHoursConfig(
  workspaceId: string
): Promise<WorkingHoursConfig> {
  try {
    const settings = await prisma.orgCapacitySettings.findUnique({
      where: { workspaceId },
      select: {
        workingHoursStart: true,
        workingHoursEnd: true,
        defaultWeeklyHoursTarget: true,
      },
    });

    if (settings) {
      // Compute daily hours from working hours window
      const startMinutes = parseTimeString(settings.workingHoursStart);
      const endMinutes = parseTimeString(settings.workingHoursEnd);
      const dailyHours = Math.max(0, (endMinutes - startMinutes) / 60);

      return {
        workingHoursStart: settings.workingHoursStart,
        workingHoursEnd: settings.workingHoursEnd,
        dailyHours,
      };
    }
  } catch {
    // Pre-migration: fields don't exist yet
  }

  return DEFAULT_WORKING_HOURS;
}

/** Parse "HH:MM" to minutes from midnight */
function parseTimeString(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
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
      severeOverloadThresholdPct: thresholds.severeOverloadThresholdPct ?? DEFAULT_CAPACITY_THRESHOLDS.severeOverloadThresholdPct,
      underutilizedThresholdPct: thresholds.underutilizedThresholdPct ?? DEFAULT_CAPACITY_THRESHOLDS.underutilizedThresholdPct,
      defaultWeeklyHoursTarget: thresholds.defaultWeeklyHoursTarget ?? DEFAULT_CAPACITY_THRESHOLDS.defaultWeeklyHoursTarget,
      thresholdAtRisk: thresholds.thresholdAtRisk ?? DEFAULT_CAPACITY_THRESHOLDS.thresholdAtRisk,
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
      ...(thresholds.severeOverloadThresholdPct !== undefined && {
        severeOverloadThresholdPct: thresholds.severeOverloadThresholdPct,
      }),
      ...(thresholds.underutilizedThresholdPct !== undefined && {
        underutilizedThresholdPct: thresholds.underutilizedThresholdPct,
      }),
      ...(thresholds.defaultWeeklyHoursTarget !== undefined && {
        defaultWeeklyHoursTarget: thresholds.defaultWeeklyHoursTarget,
      }),
      ...(thresholds.thresholdAtRisk !== undefined && {
        thresholdAtRisk: thresholds.thresholdAtRisk,
      }),
    },
  });

  return {
    lowCapacityHoursThreshold: settings.lowCapacityHoursThreshold,
    overallocationThreshold: settings.overallocationThreshold,
    minCapacityForCoverage: settings.minCapacityForCoverage,
    issueWindowDays: settings.issueWindowDays,
    severeOverloadThresholdPct: settings.severeOverloadThresholdPct,
    underutilizedThresholdPct: settings.underutilizedThresholdPct,
    defaultWeeklyHoursTarget: settings.defaultWeeklyHoursTarget,
    thresholdAtRisk: settings.thresholdAtRisk,
  };
}

/**
 * Format threshold for human-readable explanation
 */
export function formatThresholdExplanation(
  type: 'low_capacity' | 'overallocation' | 'severe_overload' | 'underutilized' | 'coverage_viability' | 'at_risk',
  thresholds: CapacityThresholds
): string {
  switch (type) {
    case 'low_capacity':
      return `below threshold (${thresholds.lowCapacityHoursThreshold}h)`;
    case 'overallocation':
      return `exceeds threshold (${Math.round(thresholds.overallocationThreshold * 100)}%)`;
    case 'severe_overload':
      return `exceeds severe threshold (${Math.round(thresholds.severeOverloadThresholdPct * 100)}%)`;
    case 'at_risk':
      return `near capacity (${Math.round(thresholds.thresholdAtRisk * 100)}–${Math.round(thresholds.overallocationThreshold * 100)}%)`;
    case 'underutilized':
      return `below threshold (${Math.round(thresholds.underutilizedThresholdPct * 100)}%)`;
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
