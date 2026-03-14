/**
 * User workload for profile page
 *
 * V1: Combines CapacityContract, WorkAllocation, and ProjectMember
 * to compute weekly capacity utilization and active projects.
 *
 * V2: Uses the capacity calculation contract engine (compute-weekly-snapshot)
 * with task-based + calendar-based data for real utilization.
 */

import { prisma } from "@/lib/db";
import { startOfWeek, addWeeks } from "date-fns";
import { getCapacityContracts, resolveContractForWindow, DEFAULT_WEEKLY_CAPACITY_HOURS } from "@/lib/org/capacity/read";
import {
  getWorkAllocations,
  computeTotalAllocatedHoursForWindow,
  computeAllocatedHoursForWindow,
  type WorkAllocation,
} from "@/lib/org/allocations";
import { AllocationContextType, ProjectTaskStatus, ProjectStatus } from "@prisma/client";
import { computeWeeklySnapshot } from "@/lib/org/capacity/compute-weekly-snapshot";
import {
  getPersonTaskCommitmentByProject,
  getTaskEstimatedHours,
  DEFAULT_TASK_EFFORT_SETTINGS,
  type TaskEffortSettings,
} from "@/lib/org/capacity/task-effort";
import {
  getPersonCapacityStatusV2,
  type CapacitySnapshotStatus,
} from "@/lib/org/capacity/status";
import { getWorkspaceThresholdsAsync } from "@/lib/org/capacity/thresholds";

export interface UserWorkload {
  totalCapacity: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPct: number;
  projects: Array<{
    id: string;
    name: string;
    hoursAllocated: number;
    role: string;
  }>;
}

export interface UserWorkloadV2 {
  totalCapacity: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPct: number;
  meetingHours: number;
  timeOffHours: number;
  effectiveHours: number;
  snapshotStatus: CapacitySnapshotStatus;
  windowLabel?: string;
  projects: Array<{
    id: string;
    name: string;
    hoursAllocated: number;
    taskCount: number;
    role: string | null;
  }>;
}

export async function getUserWorkload(
  userId: string,
  workspaceId: string
): Promise<UserWorkload> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = addWeeks(weekStart, 1);
  const timeWindow = { start: weekStart, end: weekEnd };

  const [contracts, allocations] = await Promise.all([
    getCapacityContracts(workspaceId, userId),
    getWorkAllocations(workspaceId, userId, timeWindow),
  ]);

  const resolution = resolveContractForWindow(contracts, timeWindow);
  const totalCapacity =
    resolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;

  const { totalHours: allocatedHours } = computeTotalAllocatedHoursForWindow(
    allocations,
    totalCapacity,
    timeWindow
  );

  const availableHours = totalCapacity - allocatedHours;
  const utilizationPct =
    totalCapacity > 0 ? Math.round((allocatedHours / totalCapacity) * 100) : 0;

  // Per-project breakdown: filter PROJECT allocations
  const projectAllocations = allocations.filter(
    (a): a is WorkAllocation & { contextId: string } =>
      a.contextType === AllocationContextType.PROJECT && a.contextId != null
  );

  const projectIdsFromAllocations = [
    ...new Set(projectAllocations.map((a) => a.contextId)),
  ];

  // Get project memberships for active projects (ACTIVE, ON_HOLD)
  const memberships = await prisma.projectMember.findMany({
    where: {
      userId,
      project: {
        workspaceId,
        status: { in: ["ACTIVE", "ON_HOLD"] },
      },
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
  });

  const projectIdsFromMembership = memberships.map((m) => m.project.id);
  const allProjectIds = [
    ...new Set([...projectIdsFromAllocations, ...projectIdsFromMembership]),
  ];

  const projectsData =
    allProjectIds.length > 0
      ? await prisma.project.findMany({
          where: {
            id: { in: allProjectIds },
            workspaceId,
            status: { in: ["ACTIVE", "ON_HOLD"] },
          },
          select: { id: true, name: true },
        })
      : [];

  const projectMap = new Map<string, { name: string; hours: number; role: string }>();

  for (const p of projectsData) {
    projectMap.set(p.id, { name: p.name, hours: 0, role: "member" });
  }

  for (const alloc of projectAllocations) {
    const entry = projectMap.get(alloc.contextId);
    if (entry) {
      const { hours } = computeAllocatedHoursForWindow(
        alloc,
        totalCapacity,
        timeWindow
      );
      entry.hours += hours;
    }
  }

  for (const m of memberships) {
    const entry = projectMap.get(m.project.id);
    if (entry) {
      entry.role = m.role === "OWNER" ? "owner" : "member";
    }
  }

  const projects = Array.from(projectMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      hoursAllocated: Math.round(data.hours * 10) / 10,
      role: data.role,
    }))
    .sort((a, b) => b.hoursAllocated - a.hoursAllocated);

  return {
    totalCapacity,
    allocatedHours: Math.round(allocatedHours * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
    utilizationPct,
    projects,
  };
}

/**
 * Load task effort settings from OrgCapacitySettings.
 * Falls back to defaults if no settings exist.
 */
async function getTaskEffortSettings(
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

/**
 * V2: Task-based + calendar-based workload using the capacity calculation contract engine.
 *
 * Uses computeWeeklySnapshot for real utilization data (meetings, time off, task effort)
 * and getPersonTaskCommitmentByProject for per-project breakdown.
 * Profile view uses a 2-week rolling window and includes unscheduled TODOs for display.
 */
export async function getUserWorkloadV2(
  userId: string,
  workspaceId: string
): Promise<UserWorkloadV2> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start (V2 standard)
  const weekEnd = addWeeks(weekStart, 2); // 2-week window

  const taskEffortSettings = await getTaskEffortSettings(workspaceId);

  const [snapshot1, snapshot2, projectBreakdown, thresholds] = await Promise.all([
    computeWeeklySnapshot(userId, workspaceId, weekStart),
    computeWeeklySnapshot(userId, workspaceId, addWeeks(weekStart, 1)),
    getPersonTaskCommitmentByProject(userId, workspaceId, weekStart, weekEnd, taskEffortSettings),
    getWorkspaceThresholdsAsync(workspaceId),
  ]);

  // Aggregate 2-week capacity from both snapshots, then normalize to weekly rates
  const totalCapacity2Week = snapshot1.contractHours + snapshot2.contractHours;
  const meetingHours2Week = snapshot1.meetingHours + snapshot2.meetingHours;
  const timeOffHours2Week = snapshot1.timeOffHours + snapshot2.timeOffHours;
  const effectiveHours2Week = snapshot1.effectiveHours + snapshot2.effectiveHours;

  // Normalize to weekly rates for display
  const totalCapacity = totalCapacity2Week / 2;
  const meetingHours = meetingHours2Week / 2;
  const timeOffHours = timeOffHours2Week / 2;
  const effectiveHours = effectiveHours2Week / 2;

  // Supplementary query: unscheduled TODOs (profile "what's on your plate" view)
  const unscheduledTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: userId,
      status: { in: [ProjectTaskStatus.TODO, ProjectTaskStatus.IN_PROGRESS, ProjectTaskStatus.IN_REVIEW, ProjectTaskStatus.BLOCKED] },
      dueDate: null,
      project: { status: { notIn: [ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED] } },
    },
    select: {
      id: true,
      estimatedHours: true,
      points: true,
      priority: true,
      projectId: true,
      project: { select: { name: true } },
    },
  });

  let unscheduledHours = 0;
  const unscheduledByProject = new Map<string, { projectName: string; hours: number; taskCount: number }>();

  for (const task of unscheduledTasks) {
    const { hours } = getTaskEstimatedHours(task, taskEffortSettings);
    unscheduledHours += hours;
    const projectName = task.project?.name ?? "Unassigned";
    const existing = unscheduledByProject.get(task.projectId);
    if (existing) {
      existing.hours += hours;
      existing.taskCount++;
    } else {
      unscheduledByProject.set(task.projectId, {
        projectName,
        hours,
        taskCount: 1,
      });
    }
  }

  // Merge project breakdown: scheduled + unscheduled
  const projectMap = new Map<string, { name: string; hours: number; taskCount: number }>();
  for (const p of projectBreakdown) {
    projectMap.set(p.projectId, {
      name: p.projectName,
      hours: p.hours,
      taskCount: p.taskCount,
    });
  }
  for (const [projectId, data] of unscheduledByProject) {
    const existing = projectMap.get(projectId);
    if (existing) {
      existing.hours += data.hours;
      existing.taskCount += data.taskCount;
    } else {
      projectMap.set(projectId, {
        name: data.projectName,
        hours: data.hours,
        taskCount: data.taskCount,
      });
    }
  }

  const scheduledHours = projectBreakdown.reduce((sum, p) => sum + p.hours, 0);
  const augmentedCommittedHours2Week = scheduledHours + unscheduledHours;

  // Normalize committed hours to weekly rate
  const augmentedCommittedHours = augmentedCommittedHours2Week / 2;

  // Recalculate utilization and status with normalized weekly hours
  const augmentationUtilization =
    effectiveHours > 0 ? (augmentedCommittedHours / effectiveHours) * 100 : null;
  const snapshotStatus = getPersonCapacityStatusV2(
    augmentationUtilization,
    effectiveHours,
    {
      overallocationThreshold: thresholds.overallocationThreshold * 100,
      thresholdAtRisk: (thresholds as { thresholdAtRisk?: number }).thresholdAtRisk != null
        ? (thresholds as { thresholdAtRisk?: number }).thresholdAtRisk! * 100
        : 85,
      underutilizedThresholdPct: thresholds.underutilizedThresholdPct * 100,
    }
  );

  // Normalize project hours to weekly rates
  const projects = Array.from(projectMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      hoursAllocated: Math.round((data.hours / 2) * 10) / 10,
      taskCount: data.taskCount,
      role: null as string | null,
    }))
    .sort((a, b) => b.hoursAllocated - a.hoursAllocated);

  return {
    totalCapacity,
    allocatedHours: Math.round(augmentedCommittedHours * 10) / 10,
    availableHours: effectiveHours,
    utilizationPct:
      augmentationUtilization != null ? Math.round(augmentationUtilization) : 0,
    meetingHours,
    timeOffHours,
    effectiveHours,
    snapshotStatus,
    windowLabel: "weekly avg (next 2 weeks)",
    projects,
  };
}
