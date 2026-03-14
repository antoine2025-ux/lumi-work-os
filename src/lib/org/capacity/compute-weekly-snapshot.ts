/**
 * Weekly Capacity Snapshot Computation
 *
 * Capacity calculation contract v1.0 §8: Compute and cache weekly snapshots
 * in PersonCapacity records.
 *
 * Each snapshot captures:
 * - contractHours: from CapacityContract (or workspace defaults)
 * - meetingHours: from Google Calendar events (classified per contract §3)
 * - timeOffHours: from PersonAvailability overlapping the week
 * - effectiveHours: contractHours - meetingHours - timeOffHours
 * - committedHours: from task effort estimation
 * - utilization: (committedHours / effectiveHours) × 100
 * - snapshotStatus: derived from thresholds (§6)
 */

import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import {
  getCapacityContracts,
  resolveContractForWindow,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
} from "./read";
import {
  getPersonTaskCommitmentHours,
  type TaskEffortSettings,
  DEFAULT_TASK_EFFORT_SETTINGS,
} from "./task-effort";
import {
  getWorkspaceThresholdsAsync,
  getWorkingHoursConfig,
} from "./thresholds";
import {
  getPersonCapacityStatusV2,
  type CapacitySnapshotStatus,
} from "./status";
import {
  getPersonMeetingHours,
  getPersonMeetingHoursBatch,
} from "./calendar-meeting-hours";

// ============================================================================
// Types
// ============================================================================

export type WeeklySnapshotResult = {
  personId: string;
  weekStart: Date;
  contractHours: number;
  meetingHours: number;
  timeOffHours: number;
  effectiveHours: number;
  committedHours: number;
  utilization: number | null;
  snapshotStatus: CapacitySnapshotStatus;
};

// ============================================================================
// Core Computation
// ============================================================================

/**
 * Compute and upsert a weekly capacity snapshot for a single person.
 *
 * Steps:
 * 1. Get CapacityContract (or workspace defaults)
 * 2. Calculate contractHours for the week
 * 3. Get timeOffHours from PersonAvailability
 * 4. meetingHours from Google Calendar (classified per contract §3)
 * 5. effectiveHours = contractHours - meetingHours - timeOffHours
 * 6. committedHours from task effort estimation
 * 7. utilization = effectiveHours > 0 ? (committedHours / effectiveHours) × 100 : null
 * 8. status = derive from thresholds
 * 9. Upsert PersonCapacity
 */
export async function computeWeeklySnapshot(
  personId: string,
  workspaceId: string,
  weekStartDate: Date
): Promise<WeeklySnapshotResult> {
  // Normalize to Monday of the week
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const timeWindow = { start: weekStart, end: weekEnd };

  // Load settings, contract, and working hours config in parallel
  const [contracts, thresholds, taskEffortSettings, workingHoursConfig] = await Promise.all([
    getCapacityContracts(workspaceId, personId),
    getWorkspaceThresholdsAsync(workspaceId),
    getTaskEffortSettingsFromDb(workspaceId),
    getWorkingHoursConfig(workspaceId),
  ]);

  // Step 1-2: Resolve contract and compute weekly hours
  const contractResolution = resolveContractForWindow(contracts, timeWindow);
  const weeklyHours = contractResolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;
  const workingDays = contractResolution.contract
    ? (contractResolution.contract as { workingDays?: string[] }).workingDays ?? ["MON", "TUE", "WED", "THU", "FRI"]
    : ["MON", "TUE", "WED", "THU", "FRI"];

  // Compute daily hours and count working days in this specific week
  const dailyHours = workingDays.length > 0 ? weeklyHours / workingDays.length : 0;
  const workingDaysInWeek = countWorkingDaysInWeek(weekStart, weekEnd, workingDays);
  const contractHours = dailyHours * workingDaysInWeek;

  // Step 3: Get time-off hours from PersonAvailability
  const timeOffHours = await computeTimeOffHours(
    workspaceId,
    personId,
    weekStart,
    weekEnd,
    workingDays,
    dailyHours
  );

  // Step 4: Meeting hours from Google Calendar
  const meetingResult = await getPersonMeetingHours(
    personId,
    workspaceId,
    weekStart,
    weekEnd,
    workingHoursConfig
  );
  const meetingHours = meetingResult.meetingHours;

  // Step 5: Effective hours
  const effectiveHours = Math.max(0, contractHours - meetingHours - timeOffHours);

  // Step 6: Task commitment hours
  const taskCommitment = await getPersonTaskCommitmentHours(
    personId,
    workspaceId,
    weekStart,
    weekEnd,
    taskEffortSettings
  );
  const committedHours = taskCommitment.totalCommittedHours;

  // Step 7: Utilization
  const utilization = effectiveHours > 0
    ? (committedHours / effectiveHours) * 100
    : null;

  // Step 8: Status
  const snapshotStatus = getPersonCapacityStatusV2(
    utilization,
    effectiveHours,
    {
      overallocationThreshold: thresholds.overallocationThreshold * 100, // Convert 0-1 to percentage
      thresholdAtRisk: (thresholds as { thresholdAtRisk?: number }).thresholdAtRisk != null
        ? (thresholds as { thresholdAtRisk?: number }).thresholdAtRisk! * 100
        : 85,
      underutilizedThresholdPct: thresholds.underutilizedThresholdPct * 100,
    }
  );

  // Step 9: Upsert PersonCapacity snapshot
  const snapshotData = {
    contractHours,
    meetingHours,
    timeOffHours,
    effectiveHours,
    committedHours,
    utilization,
    snapshotStatus,
  };

  await prisma.personCapacity.upsert({
    where: {
      workspaceId_personId_weekStart: {
        workspaceId,
        personId,
        weekStart,
      },
    },
    update: snapshotData,
    create: {
      workspaceId,
      personId,
      weekStart,
      ...snapshotData,
    },
  });

  return {
    personId,
    weekStart,
    ...snapshotData,
  };
}

/**
 * Compute weekly snapshots for all people in a workspace.
 * Used by nightly cron and on-demand refresh.
 */
export async function computeWeeklySnapshotBatch(
  workspaceId: string,
  weekStartDate: Date
): Promise<WeeklySnapshotResult[]> {
  // Get all active people (those with OrgPositions)
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      archivedAt: null,
      userId: { not: null },
    },
    select: { userId: true },
  });

  const personIds = [...new Set(
    positions.map((p) => p.userId).filter((id): id is string => id != null)
  )];

  if (personIds.length === 0) return [];

  // Process in parallel with concurrency limit to avoid overwhelming DB
  const BATCH_SIZE = 10;
  const results: WeeklySnapshotResult[] = [];

  for (let i = 0; i < personIds.length; i += BATCH_SIZE) {
    const batch = personIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((personId) => computeWeeklySnapshot(personId, workspaceId, weekStartDate))
    );
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// Helpers
// ============================================================================

/** Day name abbreviations matching the CapacityContract.workingDays format */
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Count how many of the person's working days fall within a specific week.
 */
function countWorkingDaysInWeek(
  weekStart: Date,
  weekEnd: Date,
  workingDays: string[]
): number {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let count = 0;
  for (const day of days) {
    const dayName = DAY_NAMES[day.getDay()];
    if (workingDays.includes(dayName)) {
      count++;
    }
  }
  return count;
}

/**
 * Compute time-off hours for a person in a week from PersonAvailability records.
 */
async function computeTimeOffHours(
  workspaceId: string,
  personId: string,
  weekStart: Date,
  weekEnd: Date,
  workingDays: string[],
  dailyHours: number
): Promise<number> {
  const availabilities = await prisma.personAvailability.findMany({
    where: {
      workspaceId,
      personId,
      type: { in: ["UNAVAILABLE", "PARTIAL"] },
      startDate: { lte: weekEnd },
      OR: [
        { endDate: null },
        { endDate: { gte: weekStart } },
      ],
    },
    select: {
      type: true,
      startDate: true,
      endDate: true,
      fraction: true,
    },
  });

  if (availabilities.length === 0) return 0;

  // For each working day in the week, check if it's covered by an availability record
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let totalTimeOffHours = 0;

  for (const day of days) {
    const dayName = DAY_NAMES[day.getDay()];
    if (!workingDays.includes(dayName)) continue;

    // Find availability records covering this day
    for (const avail of availabilities) {
      const availEnd = avail.endDate ?? new Date(8640000000000000); // far future
      if (isWithinInterval(day, { start: avail.startDate, end: availEnd })) {
        if (avail.type === "UNAVAILABLE") {
          totalTimeOffHours += dailyHours;
        } else if (avail.type === "PARTIAL" && avail.fraction != null) {
          // fraction is 0-1 representing available fraction, so time off = (1 - fraction) × daily
          totalTimeOffHours += dailyHours * (1 - avail.fraction);
        }
        break; // Only count the first matching availability per day
      }
    }
  }

  return totalTimeOffHours;
}

/**
 * Load task effort settings from OrgCapacitySettings.
 * Falls back to defaults if no settings exist.
 */
async function getTaskEffortSettingsFromDb(
  workspaceId: string
): Promise<TaskEffortSettings> {
  try {
    const settings = await prisma.orgCapacitySettings.findUnique({
      where: { workspaceId },
      select: {
        pointsMultiplier: true,
        defaultHoursUrgent: true,
        defaultHoursHigh: true,
        defaultHoursMedium: true,
        defaultHoursLow: true,
      },
    });

    if (settings) {
      return {
        pointsMultiplier: settings.pointsMultiplier,
        defaultHoursUrgent: settings.defaultHoursUrgent,
        defaultHoursHigh: settings.defaultHoursHigh,
        defaultHoursMedium: settings.defaultHoursMedium,
        defaultHoursLow: settings.defaultHoursLow,
      };
    }
  } catch {
    // Pre-migration: fields don't exist yet
  }

  return DEFAULT_TASK_EFFORT_SETTINGS;
}
