/**
 * Capacity Snapshot Invalidation
 *
 * Utilities to invalidate PersonCapacity snapshots when underlying data changes.
 * Call these when tasks are assigned/unassigned, hours change, leave is
 * approved/cancelled, or capacity contracts change.
 *
 * Invalidation = delete the snapshot so it gets recomputed on next read.
 */

import { prisma } from "@/lib/db";
import { startOfWeek } from "date-fns";
import { logger } from "@/lib/logger";

/**
 * Invalidate a person's current-week capacity snapshot.
 * The snapshot will be recomputed on next read or batch computation.
 */
export async function invalidatePersonCapacity(
  personId: string,
  workspaceId: string
): Promise<void> {
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  try {
    const deleted = await prisma.personCapacity.deleteMany({
      where: {
        workspaceId,
        personId,
        weekStart: currentWeekStart,
      },
    });

    if (deleted.count > 0) {
      logger.info("[CapacityInvalidation] Invalidated person snapshot", {
        personId,
        workspaceId,
        weekStart: currentWeekStart.toISOString(),
      });
    }
  } catch (error: unknown) {
    logger.warn("[CapacityInvalidation] Failed to invalidate person snapshot", {
      personId,
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate capacity snapshots for all people assigned to a project.
 * Use when project-level changes affect capacity (e.g., project put on hold).
 */
export async function invalidateProjectCapacity(
  projectId: string,
  workspaceId: string
): Promise<void> {
  try {
    // Find all people assigned to tasks in this project
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        assigneeId: { not: null },
        status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"] },
      },
      select: { assigneeId: true },
    });

    const personIds = [...new Set(
      tasks.map((t) => t.assigneeId).filter((id): id is string => id != null)
    )];

    if (personIds.length === 0) return;

    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    const deleted = await prisma.personCapacity.deleteMany({
      where: {
        workspaceId,
        personId: { in: personIds },
        weekStart: currentWeekStart,
      },
    });

    if (deleted.count > 0) {
      logger.info("[CapacityInvalidation] Invalidated project capacity", {
        projectId,
        workspaceId,
        affectedPeople: personIds.length,
        deletedSnapshots: deleted.count,
      });
    }
  } catch (error: unknown) {
    logger.warn("[CapacityInvalidation] Failed to invalidate project capacity", {
      projectId,
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
