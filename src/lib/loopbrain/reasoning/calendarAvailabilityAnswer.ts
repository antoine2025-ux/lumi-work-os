/**
 * Calendar Availability Answer Formatter
 *
 * Pure function: CalendarAvailabilitySnapshotV0 → LoopbrainAnswerEnvelopeV0
 * No DB calls. Fully testable.
 *
 * @see src/lib/loopbrain/contract/calendarAvailability.v0.ts
 * @see src/lib/loopbrain/contract/answer-envelope.v0.ts
 */

import type {
  LoopbrainAnswerEnvelopeV0,
  EvidenceValue,
} from "../contract/answer-envelope.v0";
import type {
  CalendarAvailabilitySnapshotV0,
  TeamAvailabilitySnapshotV0,
} from "../contract/calendarAvailability.v0";
import {
  CALENDAR_AVAILABILITY_PATHS_V0,
  DAY_OF_WEEK_LABELS_V0,
} from "../contract/calendarAvailability.v0";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

// =============================================================================
// Public API
// =============================================================================

/**
 * Format a CalendarAvailabilitySnapshotV0 into a LoopbrainAnswerEnvelopeV0.
 */
export function formatCalendarAvailabilityEnvelope(
  snapshot: CalendarAvailabilitySnapshotV0,
  questionId: string
): LoopbrainAnswerEnvelopeV0 {
  const evidence = buildEvidence(snapshot);
  const confidence = computeConfidence(snapshot);
  const summary = buildSummary(snapshot);
  const details = buildDetails(snapshot);
  const actions = buildRecommendedActions(snapshot);
  const warnings = buildWarnings(snapshot);

  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "ANSWERABLE",
    answer: {
      summary,
      details: details.length > 0 ? details : undefined,
    },
    confidence,
    supportingEvidence: evidence,
    blockingFactors: [],
    recommendedNextActions: actions,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Format a TeamAvailabilitySnapshotV0 into a LoopbrainAnswerEnvelopeV0.
 */
export function formatTeamAvailabilityEnvelope(
  snapshot: TeamAvailabilitySnapshotV0,
  questionId: string
): LoopbrainAnswerEnvelopeV0 {
  const evidence = buildTeamEvidence(snapshot);
  const confidence = snapshot.teamMetrics.totalMembers > 0 ? 0.75 : 0.5;
  const summary = buildTeamSummary(snapshot);
  const details = buildTeamDetails(snapshot);
  const actions = buildTeamActions(snapshot);

  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "ANSWERABLE",
    answer: {
      summary,
      details: details.length > 0 ? details : undefined,
    },
    confidence,
    supportingEvidence: evidence,
    blockingFactors: [],
    recommendedNextActions: actions,
  };
}

/**
 * Format a BLOCKED envelope when calendar availability data is unavailable.
 */
export function formatCalendarAvailabilityBlockedEnvelope(
  questionId: string,
  blockers: OrgReadinessBlocker[]
): LoopbrainAnswerEnvelopeV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    questionId,
    answerability: "BLOCKED",
    answer: null,
    confidence: 0.2,
    supportingEvidence: [],
    blockingFactors: blockers,
    recommendedNextActions: [
      {
        label: "Configure availability and capacity data",
        deepLink: "/org/directory",
      },
    ],
  };
}

// =============================================================================
// Person-level Helpers
// =============================================================================

function buildEvidence(
  snapshot: CalendarAvailabilitySnapshotV0
): { path: string; value: EvidenceValue }[] {
  const evidence: { path: string; value: EvidenceValue }[] = [];

  // Summary
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.ASSESSMENT,
    value: snapshot.summary.assessment,
  });
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.AVAILABILITY_SCORE,
    value: snapshot.summary.availabilityScore,
  });
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.IS_CURRENTLY_AVAILABLE,
    value: snapshot.summary.isCurrentlyAvailable,
  });

  // Forecast
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.TOTAL_AVAILABLE_HOURS,
    value: snapshot.forecast.totalAvailableHours,
  });

  // Capacity impact
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.EFFECTIVE_CAPACITY,
    value: snapshot.capacityImpact.effectiveCapacityPct,
  });
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.FOCUS_HOURS,
    value: snapshot.capacityImpact.focusHoursThisWeek,
  });

  // Weekly pattern summary
  if (snapshot.weeklyPatternSummary.busiestDay !== null) {
    evidence.push({
      path: CALENDAR_AVAILABILITY_PATHS_V0.BUSIEST_DAY,
      value: snapshot.weeklyPatternSummary.busiestDay,
    });
  }
  if (snapshot.weeklyPatternSummary.bestFocusDay !== null) {
    evidence.push({
      path: CALENDAR_AVAILABILITY_PATHS_V0.BEST_FOCUS_DAY,
      value: snapshot.weeklyPatternSummary.bestFocusDay,
    });
  }

  // Conflicts
  evidence.push({
    path: CALENDAR_AVAILABILITY_PATHS_V0.CONFLICT_COUNT,
    value: snapshot.conflictSummary.totalCount,
  });

  return evidence;
}

function computeConfidence(
  snapshot: CalendarAvailabilitySnapshotV0
): number {
  let confidence = 0.6;

  // Calendar events provide richer data
  if (Object.keys(snapshot.weeklyPattern).length > 0) {
    const hasEvents = Object.values(snapshot.weeklyPattern).some(
      (d) => d && d.meetingCount > 0
    );
    if (hasEvents) confidence += 0.15;
  }

  // Capacity data present
  if (snapshot.capacityImpact.contractedWeeklyHours > 0) {
    confidence += 0.05;
  }

  // Forecast has slots
  if (snapshot.forecast.availableSlots.length > 0) {
    confidence += 0.05;
  }

  // Absence data enriches
  if (snapshot.forecast.upcomingAbsences.length > 0) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95);
}

function buildSummary(snapshot: CalendarAvailabilitySnapshotV0): string {
  const { personName, summary, forecast, capacityImpact } = snapshot;
  const parts: string[] = [];

  if (summary.isOnExtendedLeave) {
    parts.push(`${personName} is currently on leave.`);
    if (summary.expectedReturnDate) {
      parts.push(`Expected return: ${summary.expectedReturnDate}.`);
    }
  } else {
    const assessment = summary.assessment
      .toLowerCase()
      .replace(/_/g, " ");
    parts.push(`${personName} is ${assessment}.`);

    if (forecast.totalAvailableHours > 0) {
      parts.push(
        `${forecast.totalAvailableHours}h available over the next ${forecast.forecastDays} days.`
      );
    }

    parts.push(
      `Focus time this week: ${capacityImpact.focusHoursThisWeek}h of ${capacityImpact.contractedWeeklyHours}h contracted.`
    );
  }

  return parts.join(" ");
}

function buildDetails(snapshot: CalendarAvailabilitySnapshotV0): string[] {
  const details: string[] = [];
  const { weeklyPatternSummary, capacityImpact, forecast, conflictSummary } =
    snapshot;

  // Weekly pattern
  if (weeklyPatternSummary.totalBusyHours > 0) {
    details.push(
      `Weekly meetings: ${weeklyPatternSummary.totalBusyHours.toFixed(1)}h busy, ${weeklyPatternSummary.totalFocusTime.toFixed(1)}h focus time`
    );
  }

  if (weeklyPatternSummary.busiestDay !== null) {
    const dayName = DAY_OF_WEEK_LABELS_V0[weeklyPatternSummary.busiestDay];
    details.push(`Busiest day: ${dayName}`);
  }

  if (weeklyPatternSummary.bestFocusDay !== null) {
    const dayName = DAY_OF_WEEK_LABELS_V0[weeklyPatternSummary.bestFocusDay];
    details.push(`Best focus day: ${dayName}`);
  }

  // Capacity impact
  details.push(
    `Effective capacity: ${Math.round(capacityImpact.effectiveCapacityPct * 100)}% (${capacityImpact.capacityTrend.toLowerCase().replace(/_/g, " ")})`
  );

  if (capacityImpact.absenceHoursThisWeek > 0) {
    details.push(
      `Absence hours this week: ${capacityImpact.absenceHoursThisWeek}h`
    );
  }

  // Upcoming absences
  for (const absence of forecast.upcomingAbsences.slice(0, 3)) {
    const reason = absence.reason.toLowerCase().replace(/_/g, " ");
    details.push(
      `${reason}: ${absence.startDate} to ${absence.endDate}`
    );
  }

  // Conflicts
  if (conflictSummary.totalCount > 0) {
    details.push(
      `${conflictSummary.totalCount} scheduling conflict${conflictSummary.totalCount !== 1 ? "s" : ""} detected`
    );
  }

  return details;
}

function buildRecommendedActions(
  snapshot: CalendarAvailabilitySnapshotV0
): { label: string; deepLink?: string }[] {
  const actions: { label: string; deepLink?: string }[] = [];

  if (snapshot.conflictSummary.bySeverity.high > 0) {
    actions.push({
      label: `Resolve ${snapshot.conflictSummary.bySeverity.high} high-severity conflict${snapshot.conflictSummary.bySeverity.high !== 1 ? "s" : ""}`,
      deepLink: "/calendar",
    });
  }

  if (snapshot.summary.isOnExtendedLeave) {
    actions.push({
      label: "Review absence coverage",
      deepLink: "/org/directory",
    });
  }

  if (
    snapshot.capacityImpact.capacityTrend === "SEVERELY_REDUCED" ||
    snapshot.capacityImpact.capacityTrend === "BELOW_AVERAGE"
  ) {
    actions.push({
      label: "Review meeting load",
      deepLink: "/calendar",
    });
  }

  if (snapshot.forecast.nextAvailableSlot) {
    actions.push({
      label: "View next available slot",
      deepLink: "/calendar",
    });
  }

  return actions.slice(0, 4);
}

function buildWarnings(snapshot: CalendarAvailabilitySnapshotV0): string[] {
  const warnings: string[] = [];

  const hasCalendarEvents = Object.values(snapshot.weeklyPattern).some(
    (d) => d && d.meetingCount > 0
  );
  if (!hasCalendarEvents) {
    warnings.push(
      "No calendar events available — availability is based on capacity and absence data only."
    );
  }

  if (snapshot.capacityImpact.contractedWeeklyHours === 0) {
    warnings.push("No capacity contract configured for this person.");
  }

  return warnings;
}

// =============================================================================
// Team-level Helpers
// =============================================================================

function buildTeamEvidence(
  snapshot: TeamAvailabilitySnapshotV0
): { path: string; value: EvidenceValue }[] {
  return [
    {
      path: "teamMetrics.totalMembers",
      value: snapshot.teamMetrics.totalMembers,
    },
    {
      path: "teamMetrics.availableCount",
      value: snapshot.teamMetrics.availableCount,
    },
    {
      path: "teamMetrics.onLeaveCount",
      value: snapshot.teamMetrics.onLeaveCount,
    },
    {
      path: "teamMetrics.teamAvailabilityPct",
      value: snapshot.teamMetrics.teamAvailabilityPct,
    },
    {
      path: "teamMetrics.isAtRisk",
      value: snapshot.teamMetrics.isAtRisk,
    },
  ];
}

function buildTeamSummary(snapshot: TeamAvailabilitySnapshotV0): string {
  const { teamName, teamMetrics } = snapshot;
  const parts: string[] = [];

  const pct = Math.round(teamMetrics.teamAvailabilityPct * 100);
  parts.push(
    `${teamName} has ${pct}% team availability (${teamMetrics.availableCount}/${teamMetrics.totalMembers} available).`
  );

  if (teamMetrics.onLeaveCount > 0) {
    parts.push(
      `${teamMetrics.onLeaveCount} member${teamMetrics.onLeaveCount !== 1 ? "s" : ""} on leave.`
    );
  }

  if (teamMetrics.isAtRisk) {
    parts.push("Team is at risk due to low availability.");
  }

  return parts.join(" ");
}

function buildTeamDetails(snapshot: TeamAvailabilitySnapshotV0): string[] {
  const details: string[] = [];

  for (const member of snapshot.members) {
    const status = member.assessment.toLowerCase().replace(/_/g, " ");
    let detail = `${member.personName}: ${status}`;
    if (member.isOnLeave && member.nextAvailableDate) {
      detail += ` (back ${member.nextAvailableDate})`;
    }
    details.push(detail);
  }

  return details;
}

function buildTeamActions(
  snapshot: TeamAvailabilitySnapshotV0
): { label: string; deepLink?: string }[] {
  const actions: { label: string; deepLink?: string }[] = [];

  if (snapshot.teamMetrics.isAtRisk) {
    actions.push({
      label: "Review team coverage plan",
      deepLink: "/org/structure",
    });
  }

  if (snapshot.teamMetrics.onLeaveCount > 0) {
    actions.push({
      label: "Check absence backfill",
      deepLink: "/org/directory",
    });
  }

  return actions.slice(0, 4);
}
