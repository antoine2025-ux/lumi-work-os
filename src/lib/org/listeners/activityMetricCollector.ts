/**
 * Activity Metric Collector
 * 
 * Records user activity metrics to the PersonActivityMetric model.
 * Tracks weekly activity across tasks, wiki, comments, and meetings.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getWeekStarting, calculateRollingAverage } from "./utils";

// =============================================================================
// Task Activity
// =============================================================================

/**
 * Record that a user created a task.
 * Increments tasksCreated for the current week.
 */
export async function recordTaskCreation(
  userId: string,
  workspaceId: string
): Promise<void> {
  try {
    const weekStarting = getWeekStarting();

    await prisma.personActivityMetric.upsert({
      where: {
        workspaceId_personId_weekStarting: {
          workspaceId,
          personId: userId,
          weekStarting,
        },
      },
      create: {
        workspaceId,
        personId: userId,
        weekStarting,
        tasksCreated: 1,
      },
      update: {
        tasksCreated: {
          increment: 1,
        },
      },
    });

    logger.debug("[ActivityMetricCollector] Recorded task creation", {
      userId,
      workspaceId,
      weekStarting,
    });
  } catch (error) {
    logger.error("[ActivityMetricCollector] Failed to record task creation", {
      userId,
      workspaceId,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

/**
 * Record that a user completed a task.
 * Increments tasksCompleted and updates avgCompletionDays.
 */
export async function recordTaskCompletion(
  userId: string,
  workspaceId: string,
  completionDays: number
): Promise<void> {
  try {
    const weekStarting = getWeekStarting();

    // First, get the current metric to calculate rolling average
    const currentMetric = await prisma.personActivityMetric.findUnique({
      where: {
        workspaceId_personId_weekStarting: {
          workspaceId,
          personId: userId,
          weekStarting,
        },
      },
      select: {
        tasksCompleted: true,
        avgCompletionDays: true,
      },
    });

    const currentCount = currentMetric?.tasksCompleted ?? 0;
    const currentAvg = currentMetric?.avgCompletionDays ?? null;
    const newAvg = calculateRollingAverage(currentAvg, currentCount, completionDays);

    await prisma.personActivityMetric.upsert({
      where: {
        workspaceId_personId_weekStarting: {
          workspaceId,
          personId: userId,
          weekStarting,
        },
      },
      create: {
        workspaceId,
        personId: userId,
        weekStarting,
        tasksCompleted: 1,
        avgCompletionDays: completionDays,
      },
      update: {
        tasksCompleted: {
          increment: 1,
        },
        avgCompletionDays: newAvg,
      },
    });

    logger.debug("[ActivityMetricCollector] Recorded task completion", {
      userId,
      workspaceId,
      weekStarting,
      completionDays,
      newAvg,
    });
  } catch (error) {
    logger.error("[ActivityMetricCollector] Failed to record task completion", {
      userId,
      workspaceId,
      completionDays,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Wiki Activity
// =============================================================================

/**
 * Record wiki page activity (creation or edit).
 * Increments wikisCreated or wikisEdited for the current week.
 */
export async function recordWikiActivity(
  userId: string,
  workspaceId: string,
  isNew: boolean
): Promise<void> {
  try {
    const weekStarting = getWeekStarting();

    await prisma.personActivityMetric.upsert({
      where: {
        workspaceId_personId_weekStarting: {
          workspaceId,
          personId: userId,
          weekStarting,
        },
      },
      create: {
        workspaceId,
        personId: userId,
        weekStarting,
        wikisCreated: isNew ? 1 : 0,
        wikisEdited: isNew ? 0 : 1,
      },
      update: isNew
        ? {
            wikisCreated: {
              increment: 1,
            },
          }
        : {
            wikisEdited: {
              increment: 1,
            },
          },
    });

    logger.debug("[ActivityMetricCollector] Recorded wiki activity", {
      userId,
      workspaceId,
      weekStarting,
      isNew,
    });
  } catch (error) {
    logger.error("[ActivityMetricCollector] Failed to record wiki activity", {
      userId,
      workspaceId,
      isNew,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Comment Activity
// =============================================================================

/**
 * Record that a user posted a comment.
 * Increments commentsPosted for the current week.
 */
export async function recordComment(
  userId: string,
  workspaceId: string
): Promise<void> {
  try {
    const weekStarting = getWeekStarting();

    await prisma.personActivityMetric.upsert({
      where: {
        workspaceId_personId_weekStarting: {
          workspaceId,
          personId: userId,
          weekStarting,
        },
      },
      create: {
        workspaceId,
        personId: userId,
        weekStarting,
        commentsPosted: 1,
      },
      update: {
        commentsPosted: {
          increment: 1,
        },
      },
    });

    logger.debug("[ActivityMetricCollector] Recorded comment", {
      userId,
      workspaceId,
      weekStarting,
    });
  } catch (error) {
    logger.error("[ActivityMetricCollector] Failed to record comment", {
      userId,
      workspaceId,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}

// =============================================================================
// Meeting Activity
// =============================================================================

/**
 * Record that a user attended a meeting.
 * Increments meetingsAttended and adds to meetingHours for the current week.
 */
export async function recordMeetingAttendance(
  userId: string,
  workspaceId: string,
  durationHours: number
): Promise<void> {
  try {
    const weekStarting = getWeekStarting();

    await prisma.personActivityMetric.upsert({
      where: {
        workspaceId_personId_weekStarting: {
          workspaceId,
          personId: userId,
          weekStarting,
        },
      },
      create: {
        workspaceId,
        personId: userId,
        weekStarting,
        meetingsAttended: 1,
        meetingHours: durationHours,
      },
      update: {
        meetingsAttended: {
          increment: 1,
        },
        meetingHours: {
          increment: durationHours,
        },
      },
    });

    logger.debug("[ActivityMetricCollector] Recorded meeting attendance", {
      userId,
      workspaceId,
      weekStarting,
      durationHours,
    });
  } catch (error) {
    logger.error("[ActivityMetricCollector] Failed to record meeting attendance", {
      userId,
      workspaceId,
      durationHours,
      error,
    });
    // Don't throw - event handlers should be resilient
  }
}
