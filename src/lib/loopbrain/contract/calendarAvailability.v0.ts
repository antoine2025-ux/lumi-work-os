/**
 * Calendar Availability v0 — Calendar-based Availability Contract
 *
 * Machine contract for Loopbrain reasoning about scheduling intelligence,
 * weekly patterns, availability forecasts, and conflict detection.
 * Integrates with PersonAvailability, CapacityContract, and Google Calendar.
 *
 * Invariants:
 * - All times are in ISO 8601 format
 * - Hours are in 24-hour format (0–23)
 * - Day of week uses 0=Sunday, 1=Monday, ..., 6=Saturday
 * - Percentages are 0.0–1.0 (not 0–100)
 * - Forecast horizon is configurable but defaults to 14 days
 *
 * Evidence paths for Loopbrain reasoning:
 * - weeklyPattern.{dayOfWeek}.busyHours
 * - weeklyPattern.{dayOfWeek}.focusTime
 * - forecast.{personId}.nextAvailableSlot
 * - conflicts.{conflictType}.count
 * - capacityImpact.effectiveCapacityPct
 *
 * @example
 * ```typescript
 * const snapshot: CalendarAvailabilitySnapshotV0 = {
 *   schemaVersion: "v0",
 *   generatedAt: new Date().toISOString(),
 *   workspaceId: "ws_123",
 *   personId: "person_456",
 *   personName: "Alice Smith",
 *   timezone: "America/New_York",
 *   weeklyPattern: {
 *     1: { dayOfWeek: 1, busyHours: 6, focusTime: 2, meetingDensity: 0.75, ... },
 *     // ... other days
 *   },
 *   forecast: [...],
 *   capacityImpact: { ... },
 *   conflicts: [...],
 *   summary: { ... },
 * };
 * ```
 */

// =============================================================================
// Day of Week Type
// =============================================================================

/**
 * Day of week (0=Sunday, 6=Saturday).
 */
export type DayOfWeekV0 = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Day of week labels for display.
 */
export const DAY_OF_WEEK_LABELS_V0: Record<DayOfWeekV0, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// =============================================================================
// Conflict Type Enum
// =============================================================================

/**
 * Types of calendar conflicts detected.
 * Append-only; meanings must never change.
 */
export const CALENDAR_CONFLICT_TYPE_V0 = [
  "DOUBLE_BOOKED",
  "BACK_TO_BACK",
  "AFTER_HOURS",
  "OVERLAPPING_FOCUS_TIME",
  "EXCEEDS_DAILY_LIMIT",
  "NO_LUNCH_BREAK",
  "WEEKEND_MEETING",
] as const;

export type CalendarConflictTypeV0 = (typeof CALENDAR_CONFLICT_TYPE_V0)[number];

// =============================================================================
// Availability Status Enum
// =============================================================================

/**
 * Availability status for a time slot.
 */
export const AVAILABILITY_STATUS_V0 = [
  "AVAILABLE",
  "BUSY",
  "TENTATIVE",
  "OUT_OF_OFFICE",
  "FOCUS_TIME",
] as const;

export type AvailabilityStatusV0 = (typeof AVAILABILITY_STATUS_V0)[number];

// =============================================================================
// Absence Reason Enum
// =============================================================================

/**
 * Reasons for absence/unavailability.
 * Maps to PersonAvailability.reason in Prisma schema.
 */
export const ABSENCE_REASON_V0 = [
  "VACATION",
  "SICK_LEAVE",
  "PARENTAL_LEAVE",
  "SABBATICAL",
  "JURY_DUTY",
  "BEREAVEMENT",
  "TRAINING",
  "OTHER",
] as const;

export type AbsenceReasonV0 = (typeof ABSENCE_REASON_V0)[number];

// =============================================================================
// Weekly Pattern Types
// =============================================================================

/**
 * Daily pattern metrics for a single day of the week.
 */
export type DailyPatternV0 = {
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: DayOfWeekV0;
  /** Total busy hours (meetings, blocked time) */
  busyHours: number;
  /** Hours of focus time (uninterrupted work) */
  focusTime: number;
  /**
   * Meeting density (0.0–1.0).
   * Ratio of meeting hours to working hours.
   */
  meetingDensity: number;
  /** Number of meetings */
  meetingCount: number;
  /** Average meeting duration in minutes */
  avgMeetingDurationMins: number;
  /** Longest gap between meetings in minutes */
  longestGapMins: number;
  /** Working hours start (24h format, e.g., 9 for 9am) */
  workingHoursStart: number;
  /** Working hours end (24h format, e.g., 17 for 5pm) */
  workingHoursEnd: number;
};

/**
 * Weekly pattern aggregation.
 * Keyed by day of week (0–6).
 */
export type WeeklyPatternV0 = Partial<Record<DayOfWeekV0, DailyPatternV0>>;

/**
 * Weekly pattern summary statistics.
 */
export type WeeklyPatternSummaryV0 = {
  /** Total busy hours across the week */
  totalBusyHours: number;
  /** Total focus time across the week */
  totalFocusTime: number;
  /** Average meeting density across working days */
  avgMeetingDensity: number;
  /** Day with most meetings */
  busiestDay: DayOfWeekV0 | null;
  /** Day with most focus time */
  bestFocusDay: DayOfWeekV0 | null;
};

// =============================================================================
// Forecast Types
// =============================================================================

/**
 * A single availability window in the forecast.
 */
export type AvailabilityWindowV0 = {
  /** Start time (ISO 8601) */
  startTime: string;
  /** End time (ISO 8601) */
  endTime: string;
  /** Duration in minutes */
  durationMins: number;
  /** Availability status */
  status: AvailabilityStatusV0;
  /** Optional label (e.g., "Team Standup", "Focus Block") */
  label?: string;
};

/**
 * Upcoming absence period.
 */
export type UpcomingAbsenceV0 = {
  /** Start date (ISO 8601 date) */
  startDate: string;
  /** End date (ISO 8601 date, inclusive) */
  endDate: string;
  /** Reason for absence */
  reason: AbsenceReasonV0;
  /** Capacity fraction during absence (0.0 = fully out, 0.5 = half capacity) */
  capacityFraction: number;
  /** Optional note */
  note?: string;
};

/**
 * Availability forecast for upcoming period.
 */
export type AvailabilityForecastV0 = {
  /** Forecast start date (ISO 8601) */
  forecastStartDate: string;
  /** Forecast end date (ISO 8601) */
  forecastEndDate: string;
  /** Number of days in forecast */
  forecastDays: number;
  /** Available time slots */
  availableSlots: AvailabilityWindowV0[];
  /** Upcoming absences */
  upcomingAbsences: UpcomingAbsenceV0[];
  /** Next available slot (convenience field) */
  nextAvailableSlot: AvailabilityWindowV0 | null;
  /** Total available hours in forecast period */
  totalAvailableHours: number;
};

// =============================================================================
// Capacity Impact Types
// =============================================================================

/**
 * How calendar/availability affects capacity.
 */
export type CapacityImpactV0 = {
  /** Contracted weekly capacity (hours) */
  contractedWeeklyHours: number;
  /**
   * Effective capacity after calendar commitments (0.0–1.0).
   * contractedWeeklyHours × effectiveCapacityPct = actual available hours.
   */
  effectiveCapacityPct: number;
  /** Hours lost to meetings this week */
  meetingHoursThisWeek: number;
  /** Hours lost to absences this week */
  absenceHoursThisWeek: number;
  /** Hours available for focused work this week */
  focusHoursThisWeek: number;
  /** Capacity trend compared to typical week */
  capacityTrend: "ABOVE_AVERAGE" | "AVERAGE" | "BELOW_AVERAGE" | "SEVERELY_REDUCED";
};

// =============================================================================
// Conflict Types
// =============================================================================

/**
 * A detected calendar conflict.
 */
export type CalendarConflictV0 = {
  /** Unique identifier */
  id: string;
  /** Type of conflict */
  conflictType: CalendarConflictTypeV0;
  /** When the conflict occurs (ISO 8601) */
  occurredAt: string;
  /** Human-readable description */
  description: string;
  /** Event IDs involved in conflict */
  eventIds: string[];
  /** Severity (how impactful is this conflict) */
  severity: "LOW" | "MEDIUM" | "HIGH";
};

/**
 * Conflict summary statistics.
 */
export type ConflictSummaryV0 = {
  /** Total conflicts detected */
  totalCount: number;
  /** Counts by conflict type */
  byType: Partial<Record<CalendarConflictTypeV0, number>>;
  /** Counts by severity */
  bySeverity: { low: number; medium: number; high: number };
};

// =============================================================================
// Summary Types
// =============================================================================

/**
 * Overall availability assessment.
 */
export const AVAILABILITY_ASSESSMENT_V0 = [
  "HIGHLY_AVAILABLE",
  "MODERATELY_AVAILABLE",
  "LIMITED_AVAILABILITY",
  "MOSTLY_UNAVAILABLE",
  "UNAVAILABLE",
] as const;

export type AvailabilityAssessmentV0 = (typeof AVAILABILITY_ASSESSMENT_V0)[number];

/**
 * Calendar availability summary.
 */
export type CalendarAvailabilitySummaryV0 = {
  /** Overall availability assessment */
  assessment: AvailabilityAssessmentV0;
  /** Availability score (0.0–1.0) */
  availabilityScore: number;
  /** Is person currently available right now */
  isCurrentlyAvailable: boolean;
  /** Hours until next availability (null if currently available) */
  hoursUntilAvailable: number | null;
  /** Is person on extended leave */
  isOnExtendedLeave: boolean;
  /** Expected return date if on leave (ISO 8601) */
  expectedReturnDate: string | null;
};

// =============================================================================
// Main Snapshot Type
// =============================================================================

/**
 * Calendar Availability Snapshot v0 — Full availability state for Loopbrain consumption.
 *
 * This is a machine contract, not a UI model.
 * UI may display snapshot data but never reinterpret or reformat it.
 */
export type CalendarAvailabilitySnapshotV0 = {
  /** Schema version for forward compatibility */
  schemaVersion: "v0";
  /** ISO timestamp when snapshot was generated */
  generatedAt: string;
  /** Workspace this snapshot belongs to */
  workspaceId: string;
  /** Person ID this availability is for */
  personId: string;
  /** Person name (for display) */
  personName: string;
  /** Person's timezone (IANA format, e.g., "America/New_York") */
  timezone: string;

  /** Weekly pattern analysis */
  weeklyPattern: WeeklyPatternV0;
  /** Weekly pattern summary */
  weeklyPatternSummary: WeeklyPatternSummaryV0;

  /** Upcoming availability forecast */
  forecast: AvailabilityForecastV0;

  /** Capacity impact analysis */
  capacityImpact: CapacityImpactV0;

  /** Detected conflicts */
  conflicts: CalendarConflictV0[];
  /** Conflict summary */
  conflictSummary: ConflictSummaryV0;

  /** Overall summary */
  summary: CalendarAvailabilitySummaryV0;
};

// =============================================================================
// Team Availability Snapshot
// =============================================================================

/**
 * Team-level availability summary for a single person.
 */
export type TeamMemberAvailabilityV0 = {
  personId: string;
  personName: string;
  assessment: AvailabilityAssessmentV0;
  availabilityScore: number;
  isOnLeave: boolean;
  nextAvailableDate: string | null;
};

/**
 * Team-level availability snapshot.
 */
export type TeamAvailabilitySnapshotV0 = {
  /** Schema version */
  schemaVersion: "v0";
  /** ISO timestamp */
  generatedAt: string;
  /** Workspace ID */
  workspaceId: string;
  /** Team ID */
  teamId: string;
  /** Team name */
  teamName: string;

  /** Individual member availability */
  members: TeamMemberAvailabilityV0[];

  /** Team-level metrics */
  teamMetrics: {
    /** Total team members */
    totalMembers: number;
    /** Members currently available */
    availableCount: number;
    /** Members on leave */
    onLeaveCount: number;
    /** Team availability percentage (0.0–1.0) */
    teamAvailabilityPct: number;
    /** Is team at risk due to low availability */
    isAtRisk: boolean;
  };
};

// =============================================================================
// Evidence Paths
// =============================================================================

/**
 * Canonical evidence paths for CalendarAvailabilitySnapshotV0.
 * Used by Loopbrain to cite specific data in answers.
 */
export const CALENDAR_AVAILABILITY_PATHS_V0 = {
  /** Weekly pattern paths */
  WEEKLY_PATTERN: "weeklyPattern",
  WEEKLY_PATTERN_SUMMARY: "weeklyPatternSummary",
  BUSIEST_DAY: "weeklyPatternSummary.busiestDay",
  BEST_FOCUS_DAY: "weeklyPatternSummary.bestFocusDay",

  /** Forecast paths */
  FORECAST: "forecast",
  NEXT_AVAILABLE_SLOT: "forecast.nextAvailableSlot",
  UPCOMING_ABSENCES: "forecast.upcomingAbsences",
  TOTAL_AVAILABLE_HOURS: "forecast.totalAvailableHours",

  /** Capacity impact paths */
  CAPACITY_IMPACT: "capacityImpact",
  EFFECTIVE_CAPACITY: "capacityImpact.effectiveCapacityPct",
  FOCUS_HOURS: "capacityImpact.focusHoursThisWeek",

  /** Conflict paths */
  CONFLICTS: "conflicts",
  CONFLICT_SUMMARY: "conflictSummary",
  CONFLICT_COUNT: "conflictSummary.totalCount",

  /** Summary paths */
  SUMMARY: "summary",
  ASSESSMENT: "summary.assessment",
  AVAILABILITY_SCORE: "summary.availabilityScore",
  IS_CURRENTLY_AVAILABLE: "summary.isCurrentlyAvailable",
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get conflicts by type.
 */
export function getConflictsByType(
  snapshot: CalendarAvailabilitySnapshotV0,
  conflictType: CalendarConflictTypeV0
): CalendarConflictV0[] {
  return snapshot.conflicts.filter((c) => c.conflictType === conflictType);
}

/**
 * Get daily pattern for a specific day.
 */
export function getDailyPattern(
  snapshot: CalendarAvailabilitySnapshotV0,
  dayOfWeek: DayOfWeekV0
): DailyPatternV0 | undefined {
  return snapshot.weeklyPattern[dayOfWeek];
}

/**
 * Check if person has upcoming absences.
 */
export function hasUpcomingAbsences(snapshot: CalendarAvailabilitySnapshotV0): boolean {
  return snapshot.forecast.upcomingAbsences.length > 0;
}

/**
 * Get total meeting hours for the week.
 */
export function getTotalMeetingHours(snapshot: CalendarAvailabilitySnapshotV0): number {
  return snapshot.capacityImpact.meetingHoursThisWeek;
}

/**
 * Check if person is overloaded with meetings.
 */
export function isMeetingOverloaded(
  snapshot: CalendarAvailabilitySnapshotV0,
  thresholdPct: number = 0.6
): boolean {
  return snapshot.weeklyPatternSummary.avgMeetingDensity > thresholdPct;
}

// =============================================================================
// TODO [BACKLOG]: Validation
// =============================================================================

// TODO [BACKLOG]: Add JSON Schema validation similar to validateAnswerEnvelope.ts
// - Validate schemaVersion is "v0"
// - Validate timezone is valid IANA timezone
// - Validate dayOfWeek is 0–6
// - Validate all times are ISO 8601 format
// - Validate percentages are 0.0–1.0
// - Validate hours are non-negative
