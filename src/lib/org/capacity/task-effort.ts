/**
 * Task Effort Estimation
 *
 * Capacity calculation contract v1.0 §4: Three-tier estimation hierarchy
 * for converting tasks into committed hours.
 *
 * Estimation hierarchy (first available wins):
 * 1. Explicit estimatedHours on task
 * 2. Points × pointsMultiplier (0-100 scale)
 * 3. Priority-based defaults (workspace-configurable)
 *
 * Inclusion rules (§4.4):
 * - Include: TODO, IN_PROGRESS, IN_REVIEW, BLOCKED
 * - Include: tasks with dueDate in period, OR IN_PROGRESS/BLOCKED with no dueDate
 * - Exclude: DONE, subtasks, tasks in ON_HOLD/CANCELLED projects
 *
 * Temporal distribution (§4.5):
 * - Tasks ≤ 8h → assign to week containing dueDate (or current week)
 * - Tasks > 8h → distribute evenly from creation to due date
 */

import { prisma } from "@/lib/db";
import { ProjectTaskStatus, ProjectStatus } from "@prisma/client";
import { startOfWeek, endOfWeek, differenceInCalendarWeeks, isWithinInterval } from "date-fns";

// ============================================================================
// Types
// ============================================================================

/** Minimal task shape needed for effort estimation */
export type TaskForEffort = {
  id: string;
  estimatedHours: number | null;
  points: number | null;
  priority: string | null;
  dueDate: Date | null;
  createdAt: Date;
  status: string;
};

/** Settings for task effort estimation */
export type TaskEffortSettings = {
  pointsMultiplier: number;
  defaultHoursUrgent: number;
  defaultHoursHigh: number;
  defaultHoursMedium: number;
  defaultHoursLow: number;
};

/** Default task effort settings (matches OrgCapacitySettings defaults) */
export const DEFAULT_TASK_EFFORT_SETTINGS: TaskEffortSettings = {
  pointsMultiplier: 0.4,
  defaultHoursUrgent: 4,
  defaultHoursHigh: 4,
  defaultHoursMedium: 2,
  defaultHoursLow: 1,
};

/** Result of effort estimation for a single task */
export type TaskEffortResult = {
  taskId: string;
  totalHours: number;
  hoursInWindow: number;
  source: "estimatedHours" | "points" | "priority";
};

/** Commitment summary for a person in a time window */
export type TaskCommitmentResult = {
  totalCommittedHours: number;
  taskCount: number;
  tasks: TaskEffortResult[];
  /** Whether any task had explicit hours or points (vs all priority-default) */
  hasExplicitEstimates: boolean;
};

/** Per-project task commitment breakdown */
export type ProjectTaskCommitment = {
  projectId: string;
  projectName: string;
  hours: number;
  taskCount: number;
};

// ============================================================================
// Single Task Estimation
// ============================================================================

/**
 * Get estimated hours for a single task using the 3-tier hierarchy.
 *
 * 1. estimatedHours (explicit) → use directly
 * 2. points × multiplier → derive hours
 * 3. priority default → fallback
 */
export function getTaskEstimatedHours(
  task: Pick<TaskForEffort, "estimatedHours" | "points" | "priority">,
  settings: TaskEffortSettings = DEFAULT_TASK_EFFORT_SETTINGS
): { hours: number; source: "estimatedHours" | "points" | "priority" } {
  // Tier 1: Explicit estimatedHours
  if (task.estimatedHours != null && task.estimatedHours > 0) {
    return { hours: task.estimatedHours, source: "estimatedHours" };
  }

  // Tier 2: Points-based derivation
  if (task.points != null && task.points > 0) {
    return {
      hours: task.points * settings.pointsMultiplier,
      source: "points",
    };
  }

  // Tier 3: Priority-based default
  const hours = getPriorityDefaultHours(task.priority, settings);
  return { hours, source: "priority" };
}

/**
 * Get default hours based on task priority.
 */
function getPriorityDefaultHours(
  priority: string | null,
  settings: TaskEffortSettings
): number {
  switch (priority?.toUpperCase()) {
    case "URGENT":
      return settings.defaultHoursUrgent;
    case "HIGH":
      return settings.defaultHoursHigh;
    case "MEDIUM":
      return settings.defaultHoursMedium;
    case "LOW":
      return settings.defaultHoursLow;
    default:
      return settings.defaultHoursMedium; // Unset = assume medium
  }
}

// ============================================================================
// Temporal Distribution
// ============================================================================

/**
 * Calculate hours for a task within a specific week window.
 *
 * Contract §4.5:
 * - Tasks ≤ 8h → assign entirely to the week containing dueDate (or current week if no due date)
 * - Tasks > 8h → distribute evenly from creation/start to due date
 */
export function getTaskHoursInWindow(
  task: TaskForEffort,
  totalHours: number,
  windowStart: Date,
  windowEnd: Date
): number {
  // Small tasks: assign to single week
  if (totalHours <= 8) {
    const targetDate = task.dueDate ?? new Date();
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    // Check if the target week overlaps with our window
    if (targetWeekStart <= windowEnd && targetWeekEnd >= windowStart) {
      return totalHours;
    }
    return 0;
  }

  // Large tasks: distribute evenly across weeks from creation to due date
  const taskStart = task.createdAt;
  const taskEnd = task.dueDate ?? new Date();

  // If due date is before creation (shouldn't happen), assign all to current window
  if (taskEnd <= taskStart) {
    if (isWithinInterval(new Date(), { start: windowStart, end: windowEnd })) {
      return totalHours;
    }
    return 0;
  }

  const totalWeeks = Math.max(1, differenceInCalendarWeeks(taskEnd, taskStart, { weekStartsOn: 1 }) + 1);
  const hoursPerWeek = totalHours / totalWeeks;

  // Calculate overlap between task span and our window
  const overlapStart = new Date(Math.max(taskStart.getTime(), windowStart.getTime()));
  const overlapEnd = new Date(Math.min(taskEnd.getTime(), windowEnd.getTime()));

  if (overlapStart > overlapEnd) {
    return 0; // No overlap
  }

  const overlapWeeks = Math.max(1, differenceInCalendarWeeks(overlapEnd, overlapStart, { weekStartsOn: 1 }) + 1);
  return Math.min(totalHours, hoursPerWeek * overlapWeeks);
}

// ============================================================================
// Person Commitment Query
// ============================================================================

/** Active task statuses for capacity calculation */
const ACTIVE_TASK_STATUSES: ProjectTaskStatus[] = [
  ProjectTaskStatus.TODO,
  ProjectTaskStatus.IN_PROGRESS,
  ProjectTaskStatus.IN_REVIEW,
  ProjectTaskStatus.BLOCKED,
];

/** Statuses where tasks count even without a due date */
const IN_FLIGHT_STATUSES: ProjectTaskStatus[] = [
  ProjectTaskStatus.IN_PROGRESS,
  ProjectTaskStatus.BLOCKED,
];

/**
 * Query and compute total task commitment hours for a person in a time window.
 *
 * Implements contract §4.4 inclusion/exclusion rules:
 * - Include: active statuses, assigned to person, dueDate in period or in-flight with no due date
 * - Exclude: DONE, subtasks (via Subtask model — tasks table has no parentId), ON_HOLD/CANCELLED projects
 */
export async function getPersonTaskCommitmentHours(
  personId: string,
  workspaceId: string,
  weekStart: Date,
  weekEnd: Date,
  settings: TaskEffortSettings = DEFAULT_TASK_EFFORT_SETTINGS
): Promise<TaskCommitmentResult> {
  // Query tasks assigned to this person that are active and in eligible projects
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: personId,
      status: { in: ACTIVE_TASK_STATUSES },
      project: {
        status: { notIn: [ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED] },
      },
      OR: [
        // Tasks with due date in the period
        {
          dueDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        // In-flight tasks with no due date (assume current period)
        {
          status: { in: IN_FLIGHT_STATUSES },
          dueDate: null,
        },
      ],
    },
    select: {
      id: true,
      estimatedHours: true,
      points: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      status: true,
    },
  });

  // Note: Subtasks are stored in the separate Subtask model, not in the Task table.
  // So all results from Task.findMany are parent tasks — no subtask filtering needed.

  let totalCommittedHours = 0;
  let hasExplicitEstimates = false;
  const taskResults: TaskEffortResult[] = [];

  for (const task of tasks) {
    const estimation = getTaskEstimatedHours(task, settings);
    const hoursInWindow = getTaskHoursInWindow(task, estimation.hours, weekStart, weekEnd);

    if (estimation.source !== "priority") {
      hasExplicitEstimates = true;
    }

    totalCommittedHours += hoursInWindow;
    taskResults.push({
      taskId: task.id,
      totalHours: estimation.hours,
      hoursInWindow,
      source: estimation.source,
    });
  }

  return {
    totalCommittedHours,
    taskCount: tasks.length,
    tasks: taskResults,
    hasExplicitEstimates,
  };
}

/**
 * Query task commitment hours grouped by project for a single person.
 *
 * Same inclusion/exclusion rules as getPersonTaskCommitmentHours (contract §4.4)
 * but groups results by task.projectId and includes the project name.
 * Only returns projects where the person has active tasks with hours > 0.
 */
export async function getPersonTaskCommitmentByProject(
  personId: string,
  workspaceId: string,
  weekStart: Date,
  weekEnd: Date,
  settings: TaskEffortSettings = DEFAULT_TASK_EFFORT_SETTINGS
): Promise<ProjectTaskCommitment[]> {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: personId,
      status: { in: ACTIVE_TASK_STATUSES },
      project: {
        status: { notIn: [ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED] },
      },
      OR: [
        {
          dueDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        {
          status: { in: IN_FLIGHT_STATUSES },
          dueDate: null,
        },
      ],
    },
    select: {
      id: true,
      estimatedHours: true,
      points: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      status: true,
      projectId: true,
      project: {
        select: { id: true, name: true },
      },
    },
  });

  // Accumulate per-project
  const projectMap = new Map<string, { projectName: string; hours: number; taskCount: number }>();

  for (const task of tasks) {
    const estimation = getTaskEstimatedHours(task, settings);
    const hoursInWindow = getTaskHoursInWindow(task, estimation.hours, weekStart, weekEnd);

    if (hoursInWindow <= 0) continue;

    const projectId = task.projectId;
    const projectName = task.project?.name ?? "Unassigned";

    const existing = projectMap.get(projectId);
    if (existing) {
      existing.hours += hoursInWindow;
      existing.taskCount++;
    } else {
      projectMap.set(projectId, {
        projectName,
        hours: hoursInWindow,
        taskCount: 1,
      });
    }
  }

  return Array.from(projectMap.entries())
    .map(([projectId, data]) => ({
      projectId,
      projectName: data.projectName,
      hours: Math.round(data.hours * 10) / 10,
      taskCount: data.taskCount,
    }))
    .sort((a, b) => b.hours - a.hours);
}

/**
 * Batch query task commitments for multiple people.
 * Avoids N+1 by fetching all tasks in one query, then grouping.
 */
export async function getPersonTaskCommitmentHoursBatch(
  personIds: string[],
  workspaceId: string,
  weekStart: Date,
  weekEnd: Date,
  settings: TaskEffortSettings = DEFAULT_TASK_EFFORT_SETTINGS
): Promise<Map<string, TaskCommitmentResult>> {
  if (personIds.length === 0) return new Map();

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: { in: personIds },
      status: { in: ACTIVE_TASK_STATUSES },
      project: {
        status: { notIn: [ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED] },
      },
      OR: [
        {
          dueDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        {
          status: { in: IN_FLIGHT_STATUSES },
          dueDate: null,
        },
      ],
    },
    select: {
      id: true,
      assigneeId: true,
      estimatedHours: true,
      points: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      status: true,
    },
  });

  // Initialize results for all requested people
  const results = new Map<string, TaskCommitmentResult>();
  for (const personId of personIds) {
    results.set(personId, {
      totalCommittedHours: 0,
      taskCount: 0,
      tasks: [],
      hasExplicitEstimates: false,
    });
  }

  // Group tasks by assignee and compute
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    const result = results.get(task.assigneeId);
    if (!result) continue;

    const estimation = getTaskEstimatedHours(task, settings);
    const hoursInWindow = getTaskHoursInWindow(task, estimation.hours, weekStart, weekEnd);

    if (estimation.source !== "priority") {
      result.hasExplicitEstimates = true;
    }

    result.totalCommittedHours += hoursInWindow;
    result.taskCount++;
    result.tasks.push({
      taskId: task.id,
      totalHours: estimation.hours,
      hoursInWindow,
      source: estimation.source,
    });
  }

  return results;
}
