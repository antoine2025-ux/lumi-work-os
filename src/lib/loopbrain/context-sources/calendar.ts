/**
 * Calendar Context Source
 *
 * Builds CalendarAvailabilitySnapshotV0 for a person by analyzing
 * their calendar events, availability records, and capacity contracts.
 *
 * @see src/lib/loopbrain/contract/calendarAvailability.v0.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type {
  CalendarAvailabilitySnapshotV0,
  DayOfWeekV0,
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
  CalendarConflictTypeV0,
  AbsenceReasonV0,
  TeamAvailabilitySnapshotV0,
  TeamMemberAvailabilityV0,
} from "../contract/calendarAvailability.v0";

// =============================================================================
// Types
// =============================================================================

interface BuildOptions {
  /** Forecast horizon in days */
  forecastDays?: number;
  /** Include conflict detection */
  includeConflicts?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FORECAST_DAYS = 14;
const DEFAULT_WORKING_HOURS_START = 9;
const DEFAULT_WORKING_HOURS_END = 17;
const DEFAULT_WEEKLY_HOURS = 40;
const MEETING_OVERLOAD_THRESHOLD = 0.6;
const EXTENDED_LEAVE_THRESHOLD_DAYS = 5;

// =============================================================================
// Main Builder Function
// =============================================================================

/**
 * Build a calendar availability snapshot for a person.
 */
export async function buildCalendarAvailability(
  workspaceId: string,
  personId: string,
  options: BuildOptions = {}
): Promise<CalendarAvailabilitySnapshotV0> {
  const startTime = Date.now();
  const { forecastDays = DEFAULT_FORECAST_DAYS, includeConflicts = true } = options;

  try {
    // Load person data
    const person = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: personId },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!person) {
      throw new Error(`Person ${personId} not found in workspace ${workspaceId}`);
    }

    const personName = person.user.name || person.user.email || "Unknown";

    // Load all required data in parallel
    const now = new Date();
    const forecastEndDate = new Date(now.getTime() + forecastDays * 24 * 60 * 60 * 1000);
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    const [availabilityRecordsRaw, capacityContract, calendarEvents] = await Promise.all([
      // PersonAvailability records (uses fraction, not capacityFraction)
      prisma.personAvailability.findMany({
        where: {
          workspaceId,
          personId,
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          reason: true,
          fraction: true, // Prisma uses 'fraction' not 'capacityFraction'
          note: true,
        },
      }),
      // Capacity contract (uses weeklyCapacityHours)
      prisma.capacityContract.findFirst({
        where: {
          workspaceId,
          personId,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          effectiveFrom: { lte: now },
        },
        select: {
          weeklyCapacityHours: true,
        },
      }),
      // Calendar events (if available)
      loadCalendarEvents(workspaceId, personId, weekStart, forecastEndDate),
    ]);

    // Transform availability records to expected format
    const availabilityRecords = availabilityRecordsRaw.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason ?? "OTHER",
      capacityFraction: r.fraction,
      note: r.note,
    }));

    // Build weekly pattern
    const { weeklyPattern, weeklyPatternSummary } = buildWeeklyPattern(
      calendarEvents,
      weekStart,
      weekEnd
    );

    // Build forecast
    const forecast = buildForecast(
      calendarEvents,
      availabilityRecords,
      now,
      forecastEndDate,
      forecastDays
    );

    // Build capacity impact
    const contractedHours = capacityContract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_HOURS;
    const capacityImpact = buildCapacityImpact(
      contractedHours,
      weeklyPatternSummary,
      availabilityRecords.map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
        capacityFraction: r.capacityFraction,
      })),
      now,
      weekEnd
    );

    // Detect conflicts
    const conflicts = includeConflicts
      ? detectConflicts(calendarEvents, weekStart, forecastEndDate)
      : [];
    const conflictSummary = buildConflictSummary(conflicts);

    // Build summary
    const summary = buildSummary(
      forecast,
      capacityImpact,
      availabilityRecords,
      now
    );

    const snapshot: CalendarAvailabilitySnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      personId,
      personName,
      timezone: "UTC", // Default to UTC; could be extended to use user preferences
      weeklyPattern,
      weeklyPatternSummary,
      forecast,
      capacityImpact,
      conflicts,
      conflictSummary,
      summary,
    };

    const duration = Date.now() - startTime;
    logger.info("[CalendarContext] Snapshot built", {
      workspaceId,
      personId,
      assessment: summary.assessment,
      durationMs: duration,
    });

    return snapshot;
  } catch (error) {
    logger.error("[CalendarContext] Failed to build snapshot", {
      workspaceId,
      personId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Calendar Event Loading
// =============================================================================

/**
 * Load calendar events for a person.
 * This is a placeholder that can be extended to integrate with Google Calendar,
 * Outlook, or other calendar providers.
 *
 * NOTE: CalendarEvent model does not exist in the current Prisma schema.
 * This function returns an empty array until calendar integration is implemented.
 */
async function loadCalendarEvents(
  _workspaceId: string,
  _personId: string,
  _startDate: Date,
  _endDate: Date
): Promise<CalendarEvent[]> {
  // CalendarEvent model does not exist in current schema
  // Return empty array - calendar integration to be implemented later
  return [];
}

// =============================================================================
// Weekly Pattern Builder
// =============================================================================

function buildWeeklyPattern(
  events: CalendarEvent[],
  weekStart: Date,
  weekEnd: Date
): { weeklyPattern: WeeklyPatternV0; weeklyPatternSummary: WeeklyPatternSummaryV0 } {
  const weeklyPattern: WeeklyPatternV0 = {};
  let totalBusyHours = 0;
  let totalFocusTime = 0;
  let totalMeetingDensity = 0;
  let workingDays = 0;
  let busiestDay: DayOfWeekV0 | null = null;
  let maxBusyHours = 0;
  let bestFocusDay: DayOfWeekV0 | null = null;
  let maxFocusTime = 0;

  // Process each day of the week
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(currentDay.getDate() + dayOffset);
    const dayOfWeek = currentDay.getDay() as DayOfWeekV0;

    // Skip weekends for working pattern
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    workingDays++;

    // Get events for this day
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(23, 59, 59, 999);

    const dayEvents = events.filter(
      (e) => e.startTime >= dayStart && e.startTime <= dayEnd
    );

    // Calculate metrics
    const busyHours = dayEvents.reduce((sum, e) => {
      const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    const workingHours = DEFAULT_WORKING_HOURS_END - DEFAULT_WORKING_HOURS_START;
    const focusTime = Math.max(0, workingHours - busyHours);
    const meetingDensity = Math.min(1, busyHours / workingHours);

    const avgMeetingDuration =
      dayEvents.length > 0
        ? dayEvents.reduce(
            (sum, e) => sum + (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60),
            0
          ) / dayEvents.length
        : 0;

    // Calculate longest gap
    let longestGap = 0;
    if (dayEvents.length > 1) {
      const sortedEvents = [...dayEvents].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
      for (let i = 1; i < sortedEvents.length; i++) {
        const gap =
          (sortedEvents[i].startTime.getTime() - sortedEvents[i - 1].endTime.getTime()) /
          (1000 * 60);
        if (gap > longestGap) longestGap = gap;
      }
    } else {
      longestGap = workingHours * 60; // Full day available
    }

    const dailyPattern: DailyPatternV0 = {
      dayOfWeek,
      busyHours,
      focusTime,
      meetingDensity,
      meetingCount: dayEvents.length,
      avgMeetingDurationMins: avgMeetingDuration,
      longestGapMins: longestGap,
      workingHoursStart: DEFAULT_WORKING_HOURS_START,
      workingHoursEnd: DEFAULT_WORKING_HOURS_END,
    };

    weeklyPattern[dayOfWeek] = dailyPattern;

    // Update totals
    totalBusyHours += busyHours;
    totalFocusTime += focusTime;
    totalMeetingDensity += meetingDensity;

    if (busyHours > maxBusyHours) {
      maxBusyHours = busyHours;
      busiestDay = dayOfWeek;
    }
    if (focusTime > maxFocusTime) {
      maxFocusTime = focusTime;
      bestFocusDay = dayOfWeek;
    }
  }

  const weeklyPatternSummary: WeeklyPatternSummaryV0 = {
    totalBusyHours,
    totalFocusTime,
    avgMeetingDensity: workingDays > 0 ? totalMeetingDensity / workingDays : 0,
    busiestDay,
    bestFocusDay,
  };

  return { weeklyPattern, weeklyPatternSummary };
}

// =============================================================================
// Forecast Builder
// =============================================================================

function buildForecast(
  events: CalendarEvent[],
  availabilityRecords: Array<{
    id: string;
    startDate: Date;
    endDate: Date | null;
    reason: string;
    capacityFraction: number | null;
    note: string | null;
  }>,
  now: Date,
  forecastEndDate: Date,
  forecastDays: number
): AvailabilityForecastV0 {
  const availableSlots: AvailabilityWindowV0[] = [];
  const upcomingAbsences: UpcomingAbsenceV0[] = [];
  let totalAvailableHours = 0;

  // Process availability records
  for (const record of availabilityRecords) {
    if (record.startDate <= forecastEndDate) {
      upcomingAbsences.push({
        startDate: record.startDate.toISOString().split("T")[0],
        endDate: record.endDate?.toISOString().split("T")[0] || "ongoing",
        reason: record.reason as AbsenceReasonV0,
        capacityFraction: record.capacityFraction ?? 0,
        note: record.note || undefined,
      });
    }
  }

  // Find available slots (simplified - gaps between events during working hours)
  const currentDay = new Date(now);
  while (currentDay <= forecastEndDate) {
    const dayOfWeek = currentDay.getDay();

    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Check if person is on leave this day
      const isOnLeave = availabilityRecords.some(
        (r) =>
          r.startDate <= currentDay &&
          (r.endDate === null || r.endDate >= currentDay)
      );

      if (!isOnLeave) {
        // Get events for this day
        const dayStart = new Date(currentDay);
        dayStart.setHours(DEFAULT_WORKING_HOURS_START, 0, 0, 0);
        const dayEnd = new Date(currentDay);
        dayEnd.setHours(DEFAULT_WORKING_HOURS_END, 0, 0, 0);

        const dayEvents = events
          .filter((e) => e.startTime >= dayStart && e.startTime <= dayEnd)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        // Find gaps
        let slotStart = dayStart;
        for (const event of dayEvents) {
          if (event.startTime > slotStart) {
            const durationMins =
              (event.startTime.getTime() - slotStart.getTime()) / (1000 * 60);
            if (durationMins >= 30) {
              // Minimum 30 min slot
              availableSlots.push({
                startTime: slotStart.toISOString(),
                endTime: event.startTime.toISOString(),
                durationMins,
                status: "AVAILABLE",
              });
              totalAvailableHours += durationMins / 60;
            }
          }
          slotStart = new Date(Math.max(slotStart.getTime(), event.endTime.getTime()));
        }

        // Add remaining time after last event
        if (slotStart < dayEnd) {
          const durationMins = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60);
          if (durationMins >= 30) {
            availableSlots.push({
              startTime: slotStart.toISOString(),
              endTime: dayEnd.toISOString(),
              durationMins,
              status: "AVAILABLE",
            });
            totalAvailableHours += durationMins / 60;
          }
        }
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return {
    forecastStartDate: now.toISOString().split("T")[0],
    forecastEndDate: forecastEndDate.toISOString().split("T")[0],
    forecastDays,
    availableSlots,
    upcomingAbsences,
    nextAvailableSlot: availableSlots[0] || null,
    totalAvailableHours,
  };
}

// =============================================================================
// Capacity Impact Builder
// =============================================================================

function buildCapacityImpact(
  contractedHours: number,
  weeklyPatternSummary: WeeklyPatternSummaryV0,
  availabilityRecords: Array<{
    startDate: Date;
    endDate: Date | null;
    capacityFraction: number | null;
  }>,
  now: Date,
  weekEnd: Date
): CapacityImpactV0 {
  const meetingHoursThisWeek = weeklyPatternSummary.totalBusyHours;
  const focusHoursThisWeek = weeklyPatternSummary.totalFocusTime;

  // Calculate absence hours this week
  let absenceHoursThisWeek = 0;
  for (const record of availabilityRecords) {
    if (record.startDate <= weekEnd && (record.endDate === null || record.endDate >= now)) {
      // Simplified: assume full day absence
      const daysThisWeek = Math.min(
        5,
        Math.ceil(
          (Math.min(weekEnd.getTime(), record.endDate?.getTime() || weekEnd.getTime()) -
            Math.max(now.getTime(), record.startDate.getTime())) /
            (24 * 60 * 60 * 1000)
        )
      );
      const capacityLost = 1 - (record.capacityFraction ?? 0);
      absenceHoursThisWeek += daysThisWeek * 8 * capacityLost;
    }
  }

  const effectiveCapacityPct = Math.max(
    0,
    (contractedHours - meetingHoursThisWeek - absenceHoursThisWeek) / contractedHours
  );

  // Determine capacity trend
  let capacityTrend: CapacityImpactV0["capacityTrend"];
  if (effectiveCapacityPct < 0.3) {
    capacityTrend = "SEVERELY_REDUCED";
  } else if (effectiveCapacityPct < 0.5) {
    capacityTrend = "BELOW_AVERAGE";
  } else if (effectiveCapacityPct < 0.7) {
    capacityTrend = "AVERAGE";
  } else {
    capacityTrend = "ABOVE_AVERAGE";
  }

  return {
    contractedWeeklyHours: contractedHours,
    effectiveCapacityPct,
    meetingHoursThisWeek,
    absenceHoursThisWeek,
    focusHoursThisWeek,
    capacityTrend,
  };
}

// =============================================================================
// Conflict Detection
// =============================================================================

function detectConflicts(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarConflictV0[] {
  const conflicts: CalendarConflictV0[] = [];

  // Sort events by start time
  const sortedEvents = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];

    // Check for double booking
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const otherEvent = sortedEvents[j];
      if (otherEvent.startTime >= event.endTime) break;

      // Events overlap
      conflicts.push({
        id: randomUUID(),
        conflictType: "DOUBLE_BOOKED",
        occurredAt: event.startTime.toISOString(),
        description: `"${event.title}" overlaps with "${otherEvent.title}"`,
        eventIds: [event.id, otherEvent.id],
        severity: "HIGH",
      });
    }

    // Check for back-to-back meetings
    if (i < sortedEvents.length - 1) {
      const nextEvent = sortedEvents[i + 1];
      const gap = (nextEvent.startTime.getTime() - event.endTime.getTime()) / (1000 * 60);
      if (gap >= 0 && gap < 15) {
        conflicts.push({
          id: randomUUID(),
          conflictType: "BACK_TO_BACK",
          occurredAt: event.endTime.toISOString(),
          description: `Only ${gap} minutes between "${event.title}" and "${nextEvent.title}"`,
          eventIds: [event.id, nextEvent.id],
          severity: "MEDIUM",
        });
      }
    }

    // Check for after-hours meetings
    const eventHour = event.startTime.getHours();
    if (eventHour < DEFAULT_WORKING_HOURS_START || eventHour >= DEFAULT_WORKING_HOURS_END) {
      conflicts.push({
        id: randomUUID(),
        conflictType: "AFTER_HOURS",
        occurredAt: event.startTime.toISOString(),
        description: `"${event.title}" is scheduled outside working hours`,
        eventIds: [event.id],
        severity: "LOW",
      });
    }

    // Check for weekend meetings
    const dayOfWeek = event.startTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      conflicts.push({
        id: randomUUID(),
        conflictType: "WEEKEND_MEETING",
        occurredAt: event.startTime.toISOString(),
        description: `"${event.title}" is scheduled on a weekend`,
        eventIds: [event.id],
        severity: "MEDIUM",
      });
    }
  }

  return conflicts;
}

function buildConflictSummary(conflicts: CalendarConflictV0[]): ConflictSummaryV0 {
  const byType: Partial<Record<CalendarConflictTypeV0, number>> = {};
  const bySeverity = { low: 0, medium: 0, high: 0 };

  for (const conflict of conflicts) {
    byType[conflict.conflictType] = (byType[conflict.conflictType] ?? 0) + 1;
    bySeverity[conflict.severity.toLowerCase() as keyof typeof bySeverity]++;
  }

  return {
    totalCount: conflicts.length,
    byType,
    bySeverity,
  };
}

// =============================================================================
// Summary Builder
// =============================================================================

function buildSummary(
  forecast: AvailabilityForecastV0,
  capacityImpact: CapacityImpactV0,
  availabilityRecords: Array<{
    startDate: Date;
    endDate: Date | null;
  }>,
  now: Date
): CalendarAvailabilitySummaryV0 {
  // Determine assessment
  let assessment: AvailabilityAssessmentV0;
  if (capacityImpact.effectiveCapacityPct >= 0.7) {
    assessment = "HIGHLY_AVAILABLE";
  } else if (capacityImpact.effectiveCapacityPct >= 0.5) {
    assessment = "MODERATELY_AVAILABLE";
  } else if (capacityImpact.effectiveCapacityPct >= 0.3) {
    assessment = "LIMITED_AVAILABILITY";
  } else if (capacityImpact.effectiveCapacityPct > 0) {
    assessment = "MOSTLY_UNAVAILABLE";
  } else {
    assessment = "UNAVAILABLE";
  }

  // Check if currently available
  const isCurrentlyAvailable = forecast.nextAvailableSlot !== null;
  let hoursUntilAvailable: number | null = null;
  if (!isCurrentlyAvailable && forecast.availableSlots.length > 0) {
    hoursUntilAvailable =
      (new Date(forecast.availableSlots[0].startTime).getTime() - now.getTime()) /
      (1000 * 60 * 60);
  }

  // Check for extended leave
  const currentLeave = availabilityRecords.find(
    (r) => r.startDate <= now && (r.endDate === null || r.endDate >= now)
  );
  const isOnExtendedLeave =
    currentLeave !== undefined &&
    currentLeave.endDate !== null &&
    (currentLeave.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000) >
      EXTENDED_LEAVE_THRESHOLD_DAYS;

  const expectedReturnDate = isOnExtendedLeave && currentLeave
    ? currentLeave.endDate?.toISOString().split("T")[0] || null
    : null;

  return {
    assessment,
    availabilityScore: capacityImpact.effectiveCapacityPct,
    isCurrentlyAvailable,
    hoursUntilAvailable,
    isOnExtendedLeave,
    expectedReturnDate,
  };
}

// =============================================================================
// Team Availability Builder
// =============================================================================

/**
 * Build a team availability snapshot.
 */
export async function buildTeamAvailabilitySnapshot(
  workspaceId: string,
  teamId: string,
  options: BuildOptions = {}
): Promise<TeamAvailabilitySnapshotV0> {
  const startTime = Date.now();

  try {
    // Load team data
    const team = await prisma.orgTeam.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        positions: {
          where: { isActive: true, userId: { not: null } },
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    // Build individual availability snapshots
    const members: TeamMemberAvailabilityV0[] = [];
    let availableCount = 0;
    let onLeaveCount = 0;
    let totalAvailabilityScore = 0;

    for (const position of team.positions) {
      if (!position.userId) continue;

      try {
        const snapshot = await buildCalendarAvailability(
          workspaceId,
          position.userId,
          options
        );

        const memberSummary: TeamMemberAvailabilityV0 = {
          personId: position.userId,
          personName: position.user?.name || position.user?.email || "Unknown",
          assessment: snapshot.summary.assessment,
          availabilityScore: snapshot.summary.availabilityScore,
          isOnLeave: snapshot.summary.isOnExtendedLeave,
          nextAvailableDate: snapshot.summary.isOnExtendedLeave
            ? snapshot.summary.expectedReturnDate
            : null,
        };

        members.push(memberSummary);

        totalAvailabilityScore += memberSummary.availabilityScore;

        if (memberSummary.isOnLeave) {
          onLeaveCount++;
        } else if (
          memberSummary.assessment === "HIGHLY_AVAILABLE" ||
          memberSummary.assessment === "MODERATELY_AVAILABLE"
        ) {
          availableCount++;
        }
      } catch (error) {
        logger.warn("[CalendarContext] Failed to build member snapshot", {
          teamId,
          personId: position.userId,
          error,
        });
      }
    }

    const teamAvailabilityPct =
      members.length > 0 ? totalAvailabilityScore / members.length : 0;

    // Team is at risk if less than 50% available
    const isAtRisk = teamAvailabilityPct < 0.5;

    const snapshot: TeamAvailabilitySnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      teamId,
      teamName: team.name,
      members,
      teamMetrics: {
        totalMembers: members.length,
        availableCount,
        onLeaveCount,
        teamAvailabilityPct,
        isAtRisk,
      },
    };

    const duration = Date.now() - startTime;
    logger.info("[CalendarContext] Team snapshot built", {
      workspaceId,
      teamId,
      memberCount: members.length,
      teamAvailabilityPct: Math.round(teamAvailabilityPct * 100),
      durationMs: duration,
    });

    return snapshot;
  } catch (error) {
    logger.error("[CalendarContext] Failed to build team snapshot", {
      workspaceId,
      teamId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
