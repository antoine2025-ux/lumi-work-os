/**
 * Calendar Availability Contract Tests
 *
 * A. ANSWERABLE envelope validates against JSON schema (person)
 * B. BLOCKED envelope validates against JSON schema
 * C. Evidence paths align with CALENDAR_AVAILABILITY_PATHS_V0
 * D. Team availability envelope validates
 * E. Confidence invariants hold
 * F. Self-query with no events → fully available
 * G. Other-person with absence → reports time-off
 * H. Conflict detection
 */

import { describe, it, expect } from "vitest";
import {
  formatCalendarAvailabilityEnvelope,
  formatTeamAvailabilityEnvelope,
  formatCalendarAvailabilityBlockedEnvelope,
} from "@/lib/loopbrain/reasoning/calendarAvailabilityAnswer";
import { validateAnswerEnvelopeV0 } from "@/lib/loopbrain/contract/validateAnswerEnvelope";
import { CALENDAR_AVAILABILITY_PATHS_V0 } from "@/lib/loopbrain/contract/calendarAvailability.v0";
import type {
  CalendarAvailabilitySnapshotV0,
  TeamAvailabilitySnapshotV0,
} from "@/lib/loopbrain/contract/calendarAvailability.v0";
import { isEvidencePathAllowed } from "./answer-envelope.contract.test";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAvailableSnapshot(
  overrides: Partial<CalendarAvailabilitySnapshotV0> = {}
): CalendarAvailabilitySnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    personId: "user-1",
    personName: "Alice Smith",
    timezone: "America/New_York",
    weeklyPattern: {
      1: {
        dayOfWeek: 1,
        busyHours: 3,
        focusTime: 5,
        meetingDensity: 0.375,
        meetingCount: 4,
        avgMeetingDurationMins: 45,
        longestGapMins: 120,
        workingHoursStart: 9,
        workingHoursEnd: 17,
      },
      2: {
        dayOfWeek: 2,
        busyHours: 2,
        focusTime: 6,
        meetingDensity: 0.25,
        meetingCount: 2,
        avgMeetingDurationMins: 60,
        longestGapMins: 180,
        workingHoursStart: 9,
        workingHoursEnd: 17,
      },
    },
    weeklyPatternSummary: {
      totalBusyHours: 5,
      totalFocusTime: 11,
      avgMeetingDensity: 0.3125,
      busiestDay: 1,
      bestFocusDay: 2,
    },
    forecast: {
      forecastStartDate: "2026-02-16",
      forecastEndDate: "2026-03-02",
      forecastDays: 14,
      availableSlots: [
        {
          startTime: "2026-02-17T09:00:00.000Z",
          endTime: "2026-02-17T11:00:00.000Z",
          durationMins: 120,
          status: "AVAILABLE",
        },
        {
          startTime: "2026-02-17T13:00:00.000Z",
          endTime: "2026-02-17T17:00:00.000Z",
          durationMins: 240,
          status: "AVAILABLE",
        },
      ],
      upcomingAbsences: [],
      nextAvailableSlot: {
        startTime: "2026-02-17T09:00:00.000Z",
        endTime: "2026-02-17T11:00:00.000Z",
        durationMins: 120,
        status: "AVAILABLE",
      },
      totalAvailableHours: 48,
    },
    capacityImpact: {
      contractedWeeklyHours: 40,
      effectiveCapacityPct: 0.75,
      meetingHoursThisWeek: 5,
      absenceHoursThisWeek: 0,
      focusHoursThisWeek: 30,
      capacityTrend: "AVERAGE",
    },
    conflicts: [],
    conflictSummary: {
      totalCount: 0,
      byType: {},
      bySeverity: { low: 0, medium: 0, high: 0 },
    },
    summary: {
      assessment: "MODERATELY_AVAILABLE",
      availabilityScore: 0.75,
      isCurrentlyAvailable: true,
      hoursUntilAvailable: null,
      isOnExtendedLeave: false,
      expectedReturnDate: null,
    },
    ...overrides,
  };
}

function makeOnLeaveSnapshot(): CalendarAvailabilitySnapshotV0 {
  return makeAvailableSnapshot({
    personName: "Bob Jones",
    personId: "user-2",
    forecast: {
      forecastStartDate: "2026-02-16",
      forecastEndDate: "2026-03-02",
      forecastDays: 14,
      availableSlots: [],
      upcomingAbsences: [
        {
          startDate: "2026-02-14",
          endDate: "2026-02-21",
          reason: "VACATION",
          capacityFraction: 0,
          note: "Winter holiday",
        },
      ],
      nextAvailableSlot: null,
      totalAvailableHours: 0,
    },
    capacityImpact: {
      contractedWeeklyHours: 40,
      effectiveCapacityPct: 0,
      meetingHoursThisWeek: 0,
      absenceHoursThisWeek: 40,
      focusHoursThisWeek: 0,
      capacityTrend: "SEVERELY_REDUCED",
    },
    summary: {
      assessment: "UNAVAILABLE",
      availabilityScore: 0,
      isCurrentlyAvailable: false,
      hoursUntilAvailable: null,
      isOnExtendedLeave: true,
      expectedReturnDate: "2026-02-21",
    },
  });
}

function makeNoEventsSnapshot(): CalendarAvailabilitySnapshotV0 {
  return makeAvailableSnapshot({
    weeklyPattern: {
      1: {
        dayOfWeek: 1,
        busyHours: 0,
        focusTime: 8,
        meetingDensity: 0,
        meetingCount: 0,
        avgMeetingDurationMins: 0,
        longestGapMins: 480,
        workingHoursStart: 9,
        workingHoursEnd: 17,
      },
    },
    weeklyPatternSummary: {
      totalBusyHours: 0,
      totalFocusTime: 8,
      avgMeetingDensity: 0,
      busiestDay: null,
      bestFocusDay: 1,
    },
    summary: {
      assessment: "HIGHLY_AVAILABLE",
      availabilityScore: 0.88,
      isCurrentlyAvailable: true,
      hoursUntilAvailable: null,
      isOnExtendedLeave: false,
      expectedReturnDate: null,
    },
  });
}

function makeTeamSnapshot(
  overrides: Partial<TeamAvailabilitySnapshotV0> = {}
): TeamAvailabilitySnapshotV0 {
  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId: "ws-1",
    teamId: "team-1",
    teamName: "Engineering",
    members: [
      {
        personId: "user-1",
        personName: "Alice",
        assessment: "MODERATELY_AVAILABLE",
        availabilityScore: 0.75,
        isOnLeave: false,
        nextAvailableDate: null,
      },
      {
        personId: "user-2",
        personName: "Bob",
        assessment: "UNAVAILABLE",
        availabilityScore: 0,
        isOnLeave: true,
        nextAvailableDate: "2026-02-21",
      },
      {
        personId: "user-3",
        personName: "Charlie",
        assessment: "HIGHLY_AVAILABLE",
        availabilityScore: 0.9,
        isOnLeave: false,
        nextAvailableDate: null,
      },
    ],
    teamMetrics: {
      totalMembers: 3,
      availableCount: 2,
      onLeaveCount: 1,
      teamAvailabilityPct: 0.67,
      isAtRisk: false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. Valid ANSWERABLE Envelope (Person)
// ---------------------------------------------------------------------------

describe("Calendar Availability — ANSWERABLE Envelope (Person)", () => {
  const snapshot = makeAvailableSnapshot();
  const envelope = formatCalendarAvailabilityEnvelope(
    snapshot,
    "calendar-availability"
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has answerability ANSWERABLE", () => {
    expect(envelope.answerability).toBe("ANSWERABLE");
  });

  it("has non-null answer with summary", () => {
    expect(envelope.answer).not.toBeNull();
    expect(envelope.answer!.summary.length).toBeGreaterThan(0);
  });

  it("has confidence >= 0.4", () => {
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("has non-empty supportingEvidence", () => {
    expect(envelope.supportingEvidence.length).toBeGreaterThan(0);
  });

  it("has empty blockingFactors", () => {
    expect(envelope.blockingFactors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// B. Valid BLOCKED Envelope
// ---------------------------------------------------------------------------

describe("Calendar Availability — BLOCKED Envelope", () => {
  const envelope = formatCalendarAvailabilityBlockedEnvelope(
    "calendar-availability",
    ["NO_AVAILABILITY_DATA"]
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has answerability BLOCKED", () => {
    expect(envelope.answerability).toBe("BLOCKED");
  });

  it("has null answer", () => {
    expect(envelope.answer).toBeNull();
  });

  it("has confidence <= 0.3", () => {
    expect(envelope.confidence).toBeLessThanOrEqual(0.3);
  });

  it("has non-empty blockingFactors", () => {
    expect(envelope.blockingFactors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// C. Evidence Path Alignment
// ---------------------------------------------------------------------------

describe("Calendar Availability — Evidence Path Alignment", () => {
  const snapshot = makeAvailableSnapshot();
  const envelope = formatCalendarAvailabilityEnvelope(
    snapshot,
    "calendar-availability"
  );
  const allowedPaths = Object.values(CALENDAR_AVAILABILITY_PATHS_V0);

  it("every evidence path is allowed by CALENDAR_AVAILABILITY_PATHS_V0", () => {
    for (const ev of envelope.supportingEvidence) {
      const allowed = isEvidencePathAllowed(ev.path, allowedPaths);
      expect(allowed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// D. Team Availability Envelope
// ---------------------------------------------------------------------------

describe("Calendar Availability — Team Envelope", () => {
  const snapshot = makeTeamSnapshot();
  const envelope = formatTeamAvailabilityEnvelope(
    snapshot,
    "team-availability"
  );

  it("validates against JSON schema", () => {
    const result = validateAnswerEnvelopeV0(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.errors).toHaveLength(0);
  });

  it("has ANSWERABLE with non-null answer", () => {
    expect(envelope.answerability).toBe("ANSWERABLE");
    expect(envelope.answer).not.toBeNull();
  });

  it("summary mentions team name", () => {
    expect(envelope.answer!.summary).toContain("Engineering");
  });

  it("summary mentions at-risk when applicable", () => {
    const atRiskSnapshot = makeTeamSnapshot({
      teamMetrics: {
        totalMembers: 3,
        availableCount: 1,
        onLeaveCount: 2,
        teamAvailabilityPct: 0.33,
        isAtRisk: true,
      },
    });
    const atRiskEnvelope = formatTeamAvailabilityEnvelope(
      atRiskSnapshot,
      "team-availability"
    );
    expect(atRiskEnvelope.answer!.summary.toLowerCase()).toContain("risk");
  });
});

// ---------------------------------------------------------------------------
// E. Confidence Invariants
// ---------------------------------------------------------------------------

describe("Calendar Availability — Confidence", () => {
  it("person with calendar events has confidence > 0.7", () => {
    const snapshot = makeAvailableSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.confidence).toBeGreaterThan(0.7);
  });

  it("confidence is between 0.4 and 0.95", () => {
    const snapshot = makeAvailableSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.confidence).toBeGreaterThanOrEqual(0.4);
    expect(envelope.confidence).toBeLessThanOrEqual(0.95);
  });

  it("blocked envelope has confidence <= 0.3", () => {
    const envelope = formatCalendarAvailabilityBlockedEnvelope(
      "calendar-availability",
      ["NO_CALENDAR_DATA"]
    );
    expect(envelope.confidence).toBeLessThanOrEqual(0.3);
  });
});

// ---------------------------------------------------------------------------
// F. Self-query with no events → fully available
// ---------------------------------------------------------------------------

describe("Calendar Availability — No Events (Self-query)", () => {
  it("no events produces highly available assessment", () => {
    const snapshot = makeNoEventsSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.answer!.summary.toLowerCase()).toContain("highly available");
  });

  it("no events shows warning about missing calendar data", () => {
    const snapshot = makeNoEventsSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.warnings).toBeDefined();
    expect(
      envelope.warnings!.some((w) =>
        w.toLowerCase().includes("no calendar events")
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// G. Other-person with absence → reports time-off
// ---------------------------------------------------------------------------

describe("Calendar Availability — On Leave", () => {
  it("on-leave person shows unavailable assessment", () => {
    const snapshot = makeOnLeaveSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.answer!.summary.toLowerCase()).toContain("on leave");
  });

  it("on-leave person mentions expected return date", () => {
    const snapshot = makeOnLeaveSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.answer!.summary).toContain("2026-02-21");
  });

  it("on-leave person generates review absence action", () => {
    const snapshot = makeOnLeaveSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    const labels = envelope.recommendedNextActions.map((a) =>
      a.label.toLowerCase()
    );
    expect(labels.some((l) => l.includes("absence"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H. Summary Content
// ---------------------------------------------------------------------------

describe("Calendar Availability — Summary Content", () => {
  it("available person summary includes person name", () => {
    const snapshot = makeAvailableSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.answer!.summary).toContain("Alice Smith");
  });

  it("available person summary includes available hours", () => {
    const snapshot = makeAvailableSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.answer!.summary).toContain("48h available");
  });

  it("details include weekly meeting stats when events exist", () => {
    const snapshot = makeAvailableSnapshot();
    const envelope = formatCalendarAvailabilityEnvelope(
      snapshot,
      "calendar-availability"
    );
    expect(envelope.answer!.details).toBeDefined();
    expect(
      envelope.answer!.details!.some((d) => d.includes("Weekly meetings"))
    ).toBe(true);
  });
});
