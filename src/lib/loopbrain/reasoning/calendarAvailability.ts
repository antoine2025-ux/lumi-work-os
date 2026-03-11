/**
 * Calendar Availability Snapshot Builder
 *
 * Builds CalendarAvailabilitySnapshotV0 from:
 * - PersonAvailability (time-off, absence records)
 * - CapacityContract (contracted working hours)
 * - WorkAllocation (project allocations)
 * - Optional pre-fetched calendar events (for self-query only)
 *
 * Privacy constraint: Google Calendar events can only be fetched for the
 * current session user. For other-person queries, we use org data only.
 *
 * @see src/lib/loopbrain/contract/calendarAvailability.v0.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  CalendarAvailabilitySnapshotV0,
  DailyPatternV0,
  WeeklyPatternV0,
  WeeklyPatternSummaryV0,
  AvailabilityForecastV0,
  AvailabilityWindowV0,
  UpcomingAbsenceV0,
  CapacityImpactV0,
  CalendarConflictV0,
  ConflictSummaryV0,
  CalendarAvailabilitySummaryV0,
  AvailabilityAssessmentV0,
  DayOfWeekV0,
  AbsenceReasonV0,
  TeamAvailabilitySnapshotV0,
  TeamMemberAvailabilityV0,
} from "../contract/calendarAvailability.v0";

// =============================================================================
// Types
// =============================================================================

/** Pre-fetched calendar event (from Google Calendar or similar). */
export interface CalendarEventInput {
  id: string;
  title: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  allDay?: boolean;
}

interface BuildOptions {
  /** Forecast start date (ISO 8601). Defaults to today. */
  startDate?: string;
  /** Forecast end date (ISO 8601). Defaults to startDate + 14 days. */
  endDate?: string;
  /** Pre-fetched calendar events (self-query only). */
  calendarEvents?: CalendarEventInput[];
  /** Person's timezone (IANA). Defaults to UTC. */
  timezone?: string;
  /** Default working hours start (24h). Defaults to 9. */
  workingHoursStart?: number;
  /** Default working hours end (24h). Defaults to 17. */
  workingHoursEnd?: number;
}

// =============================================================================
// Main Builder
// =============================================================================

/**
 * Build a calendar availability snapshot for a person.
 */
export async function buildCalendarAvailabilitySnapshot(
  workspaceId: string,
  personId: string,
  options: BuildOptions = {}
): Promise<CalendarAvailabilitySnapshotV0> {
  const startTime = Date.now();
  const {
    timezone = "UTC",
    workingHoursStart = 9,
    workingHoursEnd = 17,
    calendarEvents = [],
  } = options;

  const now = new Date();
  const startDate = options.startDate || now.toISOString().split("T")[0];
  const endDate =
    options.endDate ||
    new Date(new Date(startDate).getTime() + 14 * 86400000)
      .toISOString()
      .split("T")[0];

  try {
    // Load data in parallel
    const [person, availabilityRecords, capacityContract] =
      await Promise.all([
        loadPerson(workspaceId, personId),
        loadPersonAvailability(workspaceId, personId, startDate, endDate),
        loadActiveCapacityContract(workspaceId, personId),
      ]);

    const personName = person?.name || person?.email || "Unknown";
    const contractedHours = capacityContract?.weeklyCapacityHours ?? 40;

    // Build weekly pattern from calendar events
    const weeklyPattern = buildWeeklyPattern(
      calendarEvents,
      workingHoursStart,
      workingHoursEnd
    );
    const weeklyPatternSummary = buildWeeklyPatternSummary(weeklyPattern);

    // Build forecast from availability records + calendar events
    const forecast = buildForecast(
      startDate,
      endDate,
      availabilityRecords,
      calendarEvents,
      workingHoursStart,
      workingHoursEnd
    );

    // Build capacity impact
    const capacityImpact = buildCapacityImpact(
      contractedHours,
      weeklyPatternSummary.totalBusyHours,
      availabilityRecords
    );

    // Detect conflicts
    const conflicts = detectConflicts(
      calendarEvents,
      workingHoursStart,
      workingHoursEnd
    );
    const conflictSummary = buildConflictSummary(conflicts);

    // Build summary
    const summary = buildAvailabilitySummary(
      forecast,
      capacityImpact,
      availabilityRecords
    );

    const snapshot: CalendarAvailabilitySnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      personId,
      personName,
      timezone,
      weeklyPattern,
      weeklyPatternSummary,
      forecast,
      capacityImpact,
      conflicts,
      conflictSummary,
      summary,
    };

    logger.debug("Calendar availability snapshot built", {
      workspaceId,
      personId,
      forecastDays: forecast.forecastDays,
      availableHours: forecast.totalAvailableHours,
      assessment: summary.assessment,
      durationMs: Date.now() - startTime,
    });

    return snapshot;
  } catch (error: unknown) {
    logger.error("Failed to build calendar availability snapshot", {
      workspaceId,
      personId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Build a team availability snapshot.
 */
export async function buildTeamAvailabilitySnapshot(
  workspaceId: string,
  teamId: string,
  options: BuildOptions = {}
): Promise<TeamAvailabilitySnapshotV0> {
  // Load team and members
  const team = await prisma.orgTeam.findFirst({
    where: { id: teamId, workspaceId, isActive: true },
    include: {
      positions: {
        where: { isActive: true, userId: { not: null } },
        select: { userId: true, user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!team) {
    return {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      teamId,
      teamName: "Unknown Team",
      members: [],
      teamMetrics: {
        totalMembers: 0,
        availableCount: 0,
        onLeaveCount: 0,
        teamAvailabilityPct: 0,
        isAtRisk: true,
      },
    };
  }

  const memberSnapshots: TeamMemberAvailabilityV0[] = [];

  for (const pos of team.positions) {
    if (!pos.userId) continue;
    const snapshot = await buildCalendarAvailabilitySnapshot(
      workspaceId,
      pos.userId,
      options
    );
    memberSnapshots.push({
      personId: pos.userId,
      personName: pos.user?.name || "Unknown",
      assessment: snapshot.summary.assessment,
      availabilityScore: snapshot.summary.availabilityScore,
      isOnLeave: snapshot.summary.isOnExtendedLeave,
      nextAvailableDate: snapshot.summary.expectedReturnDate,
    });
  }

  const availableCount = memberSnapshots.filter(
    (m) =>
      m.assessment === "HIGHLY_AVAILABLE" ||
      m.assessment === "MODERATELY_AVAILABLE"
  ).length;
  const onLeaveCount = memberSnapshots.filter((m) => m.isOnLeave).length;
  const totalMembers = memberSnapshots.length;
  const teamAvailabilityPct =
    totalMembers > 0 ? availableCount / totalMembers : 0;

  return {
    schemaVersion: "v0",
    generatedAt: new Date().toISOString(),
    workspaceId,
    teamId,
    teamName: team.name,
    members: memberSnapshots,
    teamMetrics: {
      totalMembers,
      availableCount,
      onLeaveCount,
      teamAvailabilityPct,
      isAtRisk: teamAvailabilityPct < 0.5,
    },
  };
}

// =============================================================================
// Data Loaders
// =============================================================================

async function loadPerson(workspaceId: string, personId: string) {
  return prisma.user.findFirst({
    where: { id: personId },
    select: { id: true, name: true, email: true },
  });
}

async function loadPersonAvailability(
  workspaceId: string,
  personId: string,
  startDate: string,
  endDate: string
) {
  return prisma.personAvailability.findMany({
    where: {
      workspaceId,
      personId,
      startDate: { lte: new Date(endDate) },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date(startDate) } },
      ],
    },
    orderBy: { startDate: "asc" },
  });
}

async function loadActiveCapacityContract(
  workspaceId: string,
  personId: string
) {
  const now = new Date();
  return prisma.capacityContract.findFirst({
    where: {
      workspaceId,
      personId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

// =============================================================================
// Pattern Builders
// =============================================================================

function buildWeeklyPattern(
  events: CalendarEventInput[],
  workStart: number,
  workEnd: number
): WeeklyPatternV0 {
  const pattern: WeeklyPatternV0 = {};
  const workHoursPerDay = workEnd - workStart;

  // Group events by day of week
  const eventsByDay = new Map<DayOfWeekV0, CalendarEventInput[]>();
  for (const event of events) {
    if (event.allDay) continue;
    const start = new Date(event.startTime);
    const dow = start.getDay() as DayOfWeekV0;
    if (!eventsByDay.has(dow)) eventsByDay.set(dow, []);
    eventsByDay.get(dow)!.push(event);
  }

  // Build daily patterns for working days (Mon-Fri by default)
  for (let dow = 1; dow <= 5; dow++) {
    const dayEvents = eventsByDay.get(dow as DayOfWeekV0) || [];
    const totalMeetingMins = dayEvents.reduce((sum, e) => {
      const startMs = new Date(e.startTime).getTime();
      const endMs = new Date(e.endTime).getTime();
      return sum + (endMs - startMs) / 60000;
    }, 0);
    const busyHours = totalMeetingMins / 60;
    const focusTime = Math.max(0, workHoursPerDay - busyHours);
    const meetingDensity =
      workHoursPerDay > 0
        ? Math.min(1, busyHours / workHoursPerDay)
        : 0;

    // Compute longest gap
    const sortedEvents = [...dayEvents].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    let longestGapMins = workHoursPerDay * 60; // default: full day is free
    if (sortedEvents.length > 0) {
      longestGapMins = 0;
      // Gap before first meeting
      const firstStart = new Date(sortedEvents[0].startTime);
      const dayStart = new Date(firstStart);
      dayStart.setHours(workStart, 0, 0, 0);
      longestGapMins = Math.max(
        longestGapMins,
        (firstStart.getTime() - dayStart.getTime()) / 60000
      );
      // Gaps between meetings
      for (let i = 1; i < sortedEvents.length; i++) {
        const prevEnd = new Date(sortedEvents[i - 1].endTime).getTime();
        const nextStart = new Date(sortedEvents[i].startTime).getTime();
        longestGapMins = Math.max(
          longestGapMins,
          (nextStart - prevEnd) / 60000
        );
      }
      // Gap after last meeting
      const lastEnd = new Date(
        sortedEvents[sortedEvents.length - 1].endTime
      );
      const dayEnd = new Date(lastEnd);
      dayEnd.setHours(workEnd, 0, 0, 0);
      longestGapMins = Math.max(
        longestGapMins,
        (dayEnd.getTime() - lastEnd.getTime()) / 60000
      );
    }

    const avgDuration =
      dayEvents.length > 0 ? totalMeetingMins / dayEvents.length : 0;

    const daily: DailyPatternV0 = {
      dayOfWeek: dow as DayOfWeekV0,
      busyHours,
      focusTime,
      meetingDensity,
      meetingCount: dayEvents.length,
      avgMeetingDurationMins: Math.round(avgDuration),
      longestGapMins: Math.round(Math.max(0, longestGapMins)),
      workingHoursStart: workStart,
      workingHoursEnd: workEnd,
    };

    pattern[dow as DayOfWeekV0] = daily;
  }

  return pattern;
}

function buildWeeklyPatternSummary(
  pattern: WeeklyPatternV0
): WeeklyPatternSummaryV0 {
  let totalBusyHours = 0;
  let totalFocusTime = 0;
  let totalDensity = 0;
  let dayCount = 0;
  let busiestDay: DayOfWeekV0 | null = null;
  let bestFocusDay: DayOfWeekV0 | null = null;
  let maxBusy = -1;
  let maxFocus = -1;

  for (const [, daily] of Object.entries(pattern)) {
    if (!daily) continue;
    totalBusyHours += daily.busyHours;
    totalFocusTime += daily.focusTime;
    totalDensity += daily.meetingDensity;
    dayCount++;
    if (daily.busyHours > maxBusy) {
      maxBusy = daily.busyHours;
      busiestDay = daily.dayOfWeek;
    }
    if (daily.focusTime > maxFocus) {
      maxFocus = daily.focusTime;
      bestFocusDay = daily.dayOfWeek;
    }
  }

  return {
    totalBusyHours,
    totalFocusTime,
    avgMeetingDensity: dayCount > 0 ? totalDensity / dayCount : 0,
    busiestDay,
    bestFocusDay,
  };
}

// =============================================================================
// Forecast Builder
// =============================================================================

interface AvailabilityRecord {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date | null;
  fraction: number | null;
  reason: string | null;
  note: string | null;
  expectedReturnDate: Date | null;
}

function buildForecast(
  startDate: string,
  endDate: string,
  availabilityRecords: AvailabilityRecord[],
  calendarEvents: CalendarEventInput[],
  workStart: number,
  workEnd: number
): AvailabilityForecastV0 {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const forecastDays = Math.ceil(
    (end.getTime() - start.getTime()) / 86400000
  );
  const workHoursPerDay = workEnd - workStart;

  // Collect upcoming absences
  const upcomingAbsences: UpcomingAbsenceV0[] = availabilityRecords
    .filter((r) => r.type === "UNAVAILABLE" || r.type === "PARTIAL")
    .map((r) => ({
      startDate: r.startDate.toISOString().split("T")[0],
      endDate: (r.endDate || r.startDate).toISOString().split("T")[0],
      reason: (r.reason as AbsenceReasonV0) || "OTHER",
      capacityFraction: r.type === "PARTIAL" ? (r.fraction ?? 0.5) : 0,
      note: r.note || undefined,
    }));

  // Build available slots by iterating days
  const availableSlots: AvailabilityWindowV0[] = [];
  let totalAvailableHours = 0;

  for (let d = 0; d < forecastDays; d++) {
    const day = new Date(start.getTime() + d * 86400000);
    const dow = day.getDay();

    // Skip weekends
    if (dow === 0 || dow === 6) continue;

    // Check if day is during an absence
    const dayStr = day.toISOString().split("T")[0];
    const absence = upcomingAbsences.find(
      (a) => dayStr >= a.startDate && dayStr <= a.endDate
    );
    if (absence && absence.capacityFraction === 0) continue;

    const capacityMultiplier = absence ? absence.capacityFraction : 1;

    // Find events on this day
    const dayEvents = calendarEvents.filter((e) => {
      if (e.allDay) return false;
      const eDay = new Date(e.startTime).toISOString().split("T")[0];
      return eDay === dayStr;
    });

    if (dayEvents.length === 0) {
      // Full working day available
      const availableHours = workHoursPerDay * capacityMultiplier;
      const dayStart = new Date(day);
      dayStart.setHours(workStart, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(workEnd, 0, 0, 0);

      availableSlots.push({
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
        durationMins: Math.round(availableHours * 60),
        status: "AVAILABLE",
      });
      totalAvailableHours += availableHours;
    } else {
      // Find gaps between events
      const sorted = [...dayEvents].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      const dayStartMs = new Date(day).setHours(workStart, 0, 0, 0);
      const dayEndMs = new Date(day).setHours(workEnd, 0, 0, 0);

      // Gap before first event
      const firstEventStart = new Date(sorted[0].startTime).getTime();
      if (firstEventStart > dayStartMs) {
        const gapMins =
          ((firstEventStart - dayStartMs) / 60000) * capacityMultiplier;
        if (gapMins >= 30) {
          availableSlots.push({
            startTime: new Date(dayStartMs).toISOString(),
            endTime: sorted[0].startTime,
            durationMins: Math.round(gapMins),
            status: "AVAILABLE",
          });
          totalAvailableHours += gapMins / 60;
        }
      }

      // Gaps between events
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = new Date(sorted[i - 1].endTime).getTime();
        const nextStart = new Date(sorted[i].startTime).getTime();
        if (nextStart > prevEnd) {
          const gapMins =
            ((nextStart - prevEnd) / 60000) * capacityMultiplier;
          if (gapMins >= 30) {
            availableSlots.push({
              startTime: sorted[i - 1].endTime,
              endTime: sorted[i].startTime,
              durationMins: Math.round(gapMins),
              status: "AVAILABLE",
            });
            totalAvailableHours += gapMins / 60;
          }
        }
      }

      // Gap after last event
      const lastEventEnd = new Date(
        sorted[sorted.length - 1].endTime
      ).getTime();
      if (lastEventEnd < dayEndMs) {
        const gapMins =
          ((dayEndMs - lastEventEnd) / 60000) * capacityMultiplier;
        if (gapMins >= 30) {
          availableSlots.push({
            startTime: sorted[sorted.length - 1].endTime,
            endTime: new Date(dayEndMs).toISOString(),
            durationMins: Math.round(gapMins),
            status: "AVAILABLE",
          });
          totalAvailableHours += gapMins / 60;
        }
      }
    }
  }

  const nextAvailableSlot = availableSlots.length > 0
    ? availableSlots.find(
        (s) => new Date(s.startTime).getTime() > Date.now()
      ) || availableSlots[0]
    : null;

  return {
    forecastStartDate: startDate,
    forecastEndDate: endDate,
    forecastDays,
    availableSlots,
    upcomingAbsences,
    nextAvailableSlot,
    totalAvailableHours: Math.round(totalAvailableHours * 10) / 10,
  };
}

// =============================================================================
// Capacity Impact
// =============================================================================

function buildCapacityImpact(
  contractedHours: number,
  meetingHoursThisWeek: number,
  availabilityRecords: AvailabilityRecord[]
): CapacityImpactV0 {
  // Calculate absence hours (this week only)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5);

  let absenceHoursThisWeek = 0;
  for (const rec of availabilityRecords) {
    if (rec.type !== "UNAVAILABLE" && rec.type !== "PARTIAL") continue;
    const recStart = rec.startDate;
    const recEnd = rec.endDate || rec.startDate;
    const overlapStart = Math.max(recStart.getTime(), weekStart.getTime());
    const overlapEnd = Math.min(recEnd.getTime(), weekEnd.getTime());
    if (overlapStart < overlapEnd) {
      const overlapDays = (overlapEnd - overlapStart) / 86400000;
      const fraction = rec.type === "PARTIAL" ? (rec.fraction ?? 0.5) : 0;
      absenceHoursThisWeek += overlapDays * 8 * (1 - fraction);
    }
  }

  const focusHoursThisWeek = Math.max(
    0,
    contractedHours - meetingHoursThisWeek - absenceHoursThisWeek
  );
  const effectiveCapacity =
    contractedHours > 0
      ? Math.max(0, Math.min(1, focusHoursThisWeek / contractedHours))
      : 0;

  let capacityTrend: CapacityImpactV0["capacityTrend"];
  if (effectiveCapacity >= 0.8) capacityTrend = "ABOVE_AVERAGE";
  else if (effectiveCapacity >= 0.5) capacityTrend = "AVERAGE";
  else if (effectiveCapacity >= 0.25) capacityTrend = "BELOW_AVERAGE";
  else capacityTrend = "SEVERELY_REDUCED";

  return {
    contractedWeeklyHours: contractedHours,
    effectiveCapacityPct: Math.round(effectiveCapacity * 100) / 100,
    meetingHoursThisWeek: Math.round(meetingHoursThisWeek * 10) / 10,
    absenceHoursThisWeek: Math.round(absenceHoursThisWeek * 10) / 10,
    focusHoursThisWeek: Math.round(focusHoursThisWeek * 10) / 10,
    capacityTrend,
  };
}

// =============================================================================
// Conflict Detection
// =============================================================================

function detectConflicts(
  events: CalendarEventInput[],
  workStart: number,
  workEnd: number
): CalendarConflictV0[] {
  const conflicts: CalendarConflictV0[] = [];
  if (events.length === 0) return conflicts;

  const sorted = [...events]
    .filter((e) => !e.allDay)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    // Double booked: overlap with next event
    if (i < sorted.length - 1) {
      const nextStart = new Date(sorted[i + 1].startTime);
      if (end.getTime() > nextStart.getTime()) {
        conflicts.push({
          id: `conflict_${i}_double`,
          conflictType: "DOUBLE_BOOKED",
          occurredAt: event.startTime,
          description: `"${event.title}" overlaps with "${sorted[i + 1].title}"`,
          eventIds: [event.id, sorted[i + 1].id],
          severity: "HIGH",
        });
      }

      // Back to back: less than 5 min gap
      const gap =
        (nextStart.getTime() - end.getTime()) / 60000;
      if (gap >= 0 && gap < 5) {
        conflicts.push({
          id: `conflict_${i}_b2b`,
          conflictType: "BACK_TO_BACK",
          occurredAt: event.endTime,
          description: `No break between "${event.title}" and "${sorted[i + 1].title}"`,
          eventIds: [event.id, sorted[i + 1].id],
          severity: "LOW",
        });
      }
    }

    // After hours
    if (start.getHours() < workStart || end.getHours() > workEnd) {
      conflicts.push({
        id: `conflict_${i}_after`,
        conflictType: "AFTER_HOURS",
        occurredAt: event.startTime,
        description: `"${event.title}" is outside working hours`,
        eventIds: [event.id],
        severity: "MEDIUM",
      });
    }

    // Weekend meeting
    const dow = start.getDay();
    if (dow === 0 || dow === 6) {
      conflicts.push({
        id: `conflict_${i}_weekend`,
        conflictType: "WEEKEND_MEETING",
        occurredAt: event.startTime,
        description: `"${event.title}" is scheduled on a weekend`,
        eventIds: [event.id],
        severity: "MEDIUM",
      });
    }
  }

  return conflicts;
}

function buildConflictSummary(
  conflicts: CalendarConflictV0[]
): ConflictSummaryV0 {
  const byType: ConflictSummaryV0["byType"] = {};
  const bySeverity = { low: 0, medium: 0, high: 0 };

  for (const c of conflicts) {
    byType[c.conflictType] = (byType[c.conflictType] || 0) + 1;
    if (c.severity === "LOW") bySeverity.low++;
    else if (c.severity === "MEDIUM") bySeverity.medium++;
    else bySeverity.high++;
  }

  return { totalCount: conflicts.length, byType, bySeverity };
}

// =============================================================================
// Summary Builder
// =============================================================================

function buildAvailabilitySummary(
  forecast: AvailabilityForecastV0,
  capacityImpact: CapacityImpactV0,
  availabilityRecords: AvailabilityRecord[]
): CalendarAvailabilitySummaryV0 {
  // Check if on extended leave
  const now = new Date();
  const currentAbsence = availabilityRecords.find(
    (r) =>
      r.type === "UNAVAILABLE" &&
      r.startDate <= now &&
      (r.endDate === null || r.endDate >= now)
  );
  const isOnExtendedLeave = !!currentAbsence;
  const expectedReturnDate = currentAbsence?.endDate
    ? currentAbsence.endDate.toISOString().split("T")[0]
    : currentAbsence?.expectedReturnDate
      ? currentAbsence.expectedReturnDate.toISOString().split("T")[0]
      : null;

  // Is currently available
  const isCurrentlyAvailable = !isOnExtendedLeave &&
    capacityImpact.effectiveCapacityPct > 0;

  // Hours until available
  let hoursUntilAvailable: number | null = null;
  if (!isCurrentlyAvailable && forecast.nextAvailableSlot) {
    const nextSlotTime = new Date(forecast.nextAvailableSlot.startTime).getTime();
    hoursUntilAvailable = Math.max(
      0,
      Math.round((nextSlotTime - now.getTime()) / 3600000 * 10) / 10
    );
  }

  // Compute availability score (0-1)
  const availabilityScore = isOnExtendedLeave
    ? 0
    : capacityImpact.effectiveCapacityPct;

  // Assessment
  let assessment: AvailabilityAssessmentV0;
  if (isOnExtendedLeave) {
    assessment = "UNAVAILABLE";
  } else if (availabilityScore >= 0.7) {
    assessment = "HIGHLY_AVAILABLE";
  } else if (availabilityScore >= 0.5) {
    assessment = "MODERATELY_AVAILABLE";
  } else if (availabilityScore >= 0.25) {
    assessment = "LIMITED_AVAILABILITY";
  } else if (availabilityScore > 0) {
    assessment = "MOSTLY_UNAVAILABLE";
  } else {
    assessment = "UNAVAILABLE";
  }

  return {
    assessment,
    availabilityScore: Math.round(availabilityScore * 100) / 100,
    isCurrentlyAvailable,
    hoursUntilAvailable,
    isOnExtendedLeave,
    expectedReturnDate,
  };
}
