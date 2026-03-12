/**
 * Workload Analysis Builder
 *
 * Builds WorkloadAnalysisSnapshotV0 for a person, analyzing their
 * task load, project allocations, todos, capacity, and detecting
 * workload signals.
 *
 * @see src/lib/loopbrain/contract/workloadAnalysis.v0.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type {
  WorkloadAnalysisSnapshotV0,
  TaskLoadV0,
  TaskCountV0,
  ProjectLoadEntryV0,
  ProjectLoadSummaryV0,
  TodoLoadV0,
  WorkRequestLoadV0,
  CapacityComparisonV0,
  TemporalDistributionV0,
  WeeklyScheduleV0,
  DailyWorkloadV0,
  WorkloadSignalV0,
  SignalSummaryV0,
  WorkloadAnalysisSummaryV0,
  WorkloadAssessmentV0,
  UtilizationStatusV0,
  SignalSeverityV0,
  WorkloadSignalTypeV0,
  TeamWorkloadSnapshotV0,
  TeamMemberWorkloadV0,
} from "./contract/workloadAnalysis.v0";

// =============================================================================
// Types
// =============================================================================

interface BuildOptions {
  /** Include next week in temporal analysis */
  includeNextWeek?: boolean;
  /** Include work requests */
  includeWorkRequests?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_WEEKLY_HOURS = 40;
const OVERLOAD_THRESHOLD = 1.0;
const SEVERE_OVERLOAD_THRESHOLD = 1.2;
const UNDERUTILIZED_THRESHOLD = 0.5;
const OVERSPREAD_PROJECT_COUNT = 5;
const DEADLINE_CLUSTER_THRESHOLD = 3;

// =============================================================================
// Main Builder Function
// =============================================================================

/**
 * Build a workload analysis snapshot for a person.
 */
export async function buildWorkloadAnalysis(
  workspaceId: string,
  personId: string,
  options: BuildOptions = {}
): Promise<WorkloadAnalysisSnapshotV0> {
  const startTime = Date.now();
  const { includeNextWeek = true, includeWorkRequests = true } = options;

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
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);
    const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [tasks, todos, allocations, capacityContract, workRequests] = await Promise.all([
      // Tasks assigned to person
      prisma.task.findMany({
        where: { workspaceId, assigneeId: personId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          points: true, // Prisma schema uses 'points' not 'storyPoints'
          projectId: true,
          project: { select: { name: true } },
          updatedAt: true,
        },
        take: 500, // perf: cap per-person task load for AI analysis
        orderBy: { updatedAt: 'desc' },
      }),
      // Todos assigned to person (uses assignedToId and dueAt)
      prisma.todo.findMany({
        where: { workspaceId, assignedToId: personId },
        select: {
          id: true,
          status: true,
          priority: true,
          dueAt: true, // Prisma schema uses 'dueAt' not 'dueDate'
        },
        take: 200, // perf: cap per-person todo load
      }),
      // Work allocations (uses contextType/contextId, not projectId)
      prisma.workAllocation.findMany({
        where: {
          workspaceId,
          personId,
          OR: [{ endDate: null }, { endDate: { gte: now } }],
          startDate: { lte: now },
        },
        select: {
          id: true,
          contextType: true,
          contextId: true,
          contextLabel: true,
          allocationPercent: true,
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
      // Work requests (uses requesterPersonId, no assigneeId)
      includeWorkRequests
        ? prisma.workRequest.findMany({
            where: {
              workspaceId,
              requesterPersonId: personId,
            },
            select: {
              id: true,
              status: true,
              priority: true,
              effortHours: true, // Prisma uses effortHours not estimatedHours
            },
            take: 100, // perf: cap work requests per person
          })
        : [],
    ]);

    // Transform tasks to expected format (map points to storyPoints for internal use)
    const transformedTasks = tasks.map((t) => ({
      ...t,
      storyPoints: t.points,
      estimatedHours: t.points ? t.points * 2 : null, // Estimate: 1 point = 2 hours
    }));

    // Transform todos to expected format (map dueAt to dueDate)
    const transformedTodos = todos.map((t) => ({
      ...t,
      dueDate: t.dueAt,
    }));

    // Transform allocations to expected format (use contextId as projectId for PROJECT allocations)
    const transformedAllocations = allocations
      .filter((a) => a.contextType === "PROJECT" && a.contextId)
      .map((a) => ({
        projectId: a.contextId!,
        projectName: a.contextLabel || "Unknown Project",
        allocationPercent: a.allocationPercent,
      }));

    // Transform work requests
    const transformedWorkRequests = workRequests.map((wr) => ({
      id: wr.id,
      status: wr.status,
      priority: wr.priority,
      estimatedHours: wr.effortHours,
    }));

    // Build task load
    const taskLoad = buildTaskLoad(transformedTasks, now);

    // Build project load
    const { projectLoad, projectLoadSummary } = buildProjectLoad(
      transformedTasks.map((t) => ({
        projectId: t.projectId,
        project: t.project,
        status: t.status,
        estimatedHours: t.estimatedHours,
      })),
      transformedAllocations
    );

    // Build todo load
    const todoLoad = buildTodoLoad(transformedTodos, now);

    // Build work request load
    const workRequestLoad = includeWorkRequests
      ? buildWorkRequestLoad(transformedWorkRequests)
      : null;

    // Build capacity comparison
    const contractedHours = capacityContract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_HOURS;
    const capacityComparison = buildCapacityComparison(
      contractedHours,
      allocations,
      taskLoad.totalEstimatedHours
    );

    // Build temporal distribution
    const temporalDistribution = buildTemporalDistribution(
      transformedTasks.map((t) => ({
        id: t.id,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
      })),
      transformedTodos.map((t) => ({
        id: t.id,
        dueDate: t.dueDate,
      })),
      weekStart,
      weekEnd,
      includeNextWeek ? nextWeekStart : null,
      includeNextWeek ? nextWeekEnd : null
    );

    // Detect signals
    const signals = detectWorkloadSignals(
      taskLoad,
      projectLoadSummary,
      capacityComparison,
      temporalDistribution,
      tasks.map((t) => ({ id: t.id, status: t.status, updatedAt: t.updatedAt }))
    );

    // Build signal summary
    const signalSummary = buildSignalSummary(signals);

    // Build overall summary
    const summary = buildSummary(
      taskLoad,
      capacityComparison,
      signalSummary
    );

    const snapshot: WorkloadAnalysisSnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      personId,
      personName,
      taskLoad,
      projectLoad,
      projectLoadSummary,
      todoLoad,
      workRequestLoad,
      capacityComparison,
      temporalDistribution,
      signals,
      signalSummary,
      summary,
    };

    const duration = Date.now() - startTime;
    logger.info("[WorkloadAnalysis] Snapshot built", {
      workspaceId,
      personId,
      taskCount: taskLoad.totalCount,
      assessment: summary.assessment,
      durationMs: duration,
    });

    return snapshot;
  } catch (error: unknown) {
    logger.error("[WorkloadAnalysis] Failed to build snapshot", {
      workspaceId,
      personId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Task Load Builder
// =============================================================================

function buildTaskLoad(
  tasks: Array<{
    id: string;
    status: string;
    priority: string | null;
    dueDate: Date | null;
    estimatedHours: number | null;
    storyPoints: number | null;
  }>,
  now: Date
): TaskLoadV0 {
  const byStatus: Record<string, TaskCountV0> = {};
  const byPriority: Record<string, TaskCountV0> = {};
  const overdueTasks: Array<{ id: string; daysOverdue: number }> = [];

  let totalPoints = 0;
  let totalEstimatedHours = 0;
  let dueThisWeek = 0;
  let dueToday = 0;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = getWeekEnd(now);

  for (const task of tasks) {
    // By status
    if (!byStatus[task.status]) {
      byStatus[task.status] = { count: 0, points: null, estimatedHours: null };
    }
    byStatus[task.status].count++;
    if (task.storyPoints) {
      byStatus[task.status].points = (byStatus[task.status].points ?? 0) + task.storyPoints;
    }
    if (task.estimatedHours) {
      byStatus[task.status].estimatedHours =
        (byStatus[task.status].estimatedHours ?? 0) + task.estimatedHours;
    }

    // By priority
    const priority = task.priority || "MEDIUM";
    if (!byPriority[priority]) {
      byPriority[priority] = { count: 0, points: null, estimatedHours: null };
    }
    byPriority[priority].count++;
    if (task.storyPoints) {
      byPriority[priority].points = (byPriority[priority].points ?? 0) + task.storyPoints;
    }
    if (task.estimatedHours) {
      byPriority[priority].estimatedHours =
        (byPriority[priority].estimatedHours ?? 0) + task.estimatedHours;
    }

    // Totals
    if (task.storyPoints) totalPoints += task.storyPoints;
    if (task.estimatedHours) totalEstimatedHours += task.estimatedHours;

    // Due dates
    if (task.dueDate) {
      if (task.dueDate < now && task.status !== "DONE") {
        const daysOverdue = Math.ceil(
          (now.getTime() - task.dueDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        overdueTasks.push({ id: task.id, daysOverdue });
      }
      if (task.dueDate >= todayStart && task.dueDate <= todayEnd) {
        dueToday++;
      }
      if (task.dueDate >= now && task.dueDate <= weekEnd) {
        dueThisWeek++;
      }
    }
  }

  return {
    totalCount: tasks.length,
    totalPoints: totalPoints > 0 ? totalPoints : null,
    totalEstimatedHours: totalEstimatedHours > 0 ? totalEstimatedHours : null,
    byStatus,
    byPriority,
    overdue: {
      count: overdueTasks.length,
      totalDaysOverdue: overdueTasks.reduce((sum, t) => sum + t.daysOverdue, 0),
      maxDaysOverdue: Math.max(0, ...overdueTasks.map((t) => t.daysOverdue)),
      taskIds: overdueTasks.map((t) => t.id),
    },
    dueThisWeek,
    dueToday,
  };
}

// =============================================================================
// Project Load Builder
// =============================================================================

function buildProjectLoad(
  tasks: Array<{
    projectId: string;
    project: { name: string };
    status: string;
    estimatedHours: number | null;
  }>,
  allocations: Array<{
    projectId: string;
    allocationPercent: number;
  }>
): { projectLoad: ProjectLoadEntryV0[]; projectLoadSummary: ProjectLoadSummaryV0 } {
  // Group tasks by project
  const projectTasks = new Map<
    string,
    { name: string; tasks: typeof tasks; allocation: number }
  >();

  for (const task of tasks) {
    const existing = projectTasks.get(task.projectId) || {
      name: task.project.name,
      tasks: [],
      allocation: 0,
    };
    existing.tasks.push(task);
    projectTasks.set(task.projectId, existing);
  }

  // Add allocations
  for (const alloc of allocations) {
    const existing = projectTasks.get(alloc.projectId) || {
      name: "Unknown Project",
      tasks: [],
      allocation: 0,
    };
    existing.allocation += alloc.allocationPercent;
    projectTasks.set(alloc.projectId, existing);
  }

  // Build project load entries
  const projectLoad: ProjectLoadEntryV0[] = [];
  let totalAllocation = 0;
  let maxAllocation = 0;
  let primaryProjectId: string | null = null;

  for (const [projectId, data] of projectTasks) {
    const inProgressCount = data.tasks.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;
    const blockedCount = data.tasks.filter((t) => t.status === "BLOCKED").length;
    const estimatedHours = data.tasks.reduce(
      (sum, t) => sum + (t.estimatedHours ?? 0),
      0
    );

    projectLoad.push({
      projectId,
      projectName: data.name,
      allocationPct: data.allocation,
      taskCount: data.tasks.length,
      inProgressCount,
      blockedCount,
      estimatedHours: estimatedHours > 0 ? estimatedHours : null,
    });

    totalAllocation += data.allocation;
    if (data.allocation > maxAllocation) {
      maxAllocation = data.allocation;
      primaryProjectId = projectId;
    }
  }

  // Sort by allocation descending
  projectLoad.sort((a, b) => b.allocationPct - a.allocationPct);

  const projectLoadSummary: ProjectLoadSummaryV0 = {
    projectCount: projectLoad.length,
    totalAllocationPct: totalAllocation,
    isOverSpread: projectLoad.length > OVERSPREAD_PROJECT_COUNT,
    primaryProjectId,
  };

  return { projectLoad, projectLoadSummary };
}

// =============================================================================
// Todo Load Builder
// =============================================================================

function buildTodoLoad(
  todos: Array<{
    id: string;
    status: string;
    priority: string | null;
    dueDate: Date | null;
  }>,
  now: Date
): TodoLoadV0 {
  const byPriority: Partial<Record<"LOW" | "MEDIUM" | "HIGH", number>> = {};
  let openCount = 0;
  let doneCount = 0;
  let dueToday = 0;
  let dueThisWeek = 0;
  let overdueCount = 0;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = getWeekEnd(now);

  for (const todo of todos) {
    if (todo.status === "OPEN") {
      openCount++;
    } else {
      doneCount++;
    }

    const priority = (todo.priority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";
    byPriority[priority] = (byPriority[priority] ?? 0) + 1;

    if (todo.dueDate) {
      if (todo.dueDate < now && todo.status === "OPEN") {
        overdueCount++;
      }
      if (todo.dueDate >= todayStart && todo.dueDate <= todayEnd) {
        dueToday++;
      }
      if (todo.dueDate >= now && todo.dueDate <= weekEnd) {
        dueThisWeek++;
      }
    }
  }

  return {
    totalCount: todos.length,
    openCount,
    doneCount,
    byPriority,
    dueToday,
    dueThisWeek,
    overdueCount,
  };
}

// =============================================================================
// Work Request Load Builder
// =============================================================================

function buildWorkRequestLoad(
  workRequests: Array<{
    id: string;
    status: string;
    priority: string | null;
    estimatedHours: number | null;
  }>
): WorkRequestLoadV0 {
  const byPriority: Partial<Record<"P0" | "P1" | "P2" | "P3", number>> = {};
  let openCount = 0;
  let closedCount = 0;
  let totalEstimatedHours = 0;

  for (const wr of workRequests) {
    if (wr.status === "OPEN" || wr.status === "IN_PROGRESS") {
      openCount++;
    } else {
      closedCount++;
    }

    const priority = (wr.priority || "P2") as "P0" | "P1" | "P2" | "P3";
    byPriority[priority] = (byPriority[priority] ?? 0) + 1;

    if (wr.estimatedHours) {
      totalEstimatedHours += wr.estimatedHours;
    }
  }

  return {
    totalCount: workRequests.length,
    openCount,
    closedCount,
    totalEstimatedHours,
    byPriority,
  };
}

// =============================================================================
// Capacity Comparison Builder
// =============================================================================

function buildCapacityComparison(
  contractedHours: number,
  allocations: Array<{ allocationPercent: number }>,
  estimatedHours: number | null
): CapacityComparisonV0 {
  const totalAllocation = allocations.reduce(
    (sum, a) => sum + a.allocationPercent,
    0
  );
  const allocatedHours = totalAllocation * contractedHours;
  const actualEstimatedHours = estimatedHours ?? 0;

  const allocatedPct = allocatedHours / contractedHours;
  const utilizationPct = actualEstimatedHours / contractedHours;

  let utilizationStatus: UtilizationStatusV0;
  if (utilizationPct >= SEVERE_OVERLOAD_THRESHOLD) {
    utilizationStatus = "SEVERELY_OVERLOADED";
  } else if (utilizationPct >= OVERLOAD_THRESHOLD) {
    utilizationStatus = "OVERLOADED";
  } else if (utilizationPct >= 0.8) {
    utilizationStatus = "HIGH";
  } else if (utilizationPct >= UNDERUTILIZED_THRESHOLD) {
    utilizationStatus = "HEALTHY";
  } else {
    utilizationStatus = "UNDERUTILIZED";
  }

  const headroomHours = contractedHours - actualEstimatedHours;

  return {
    contractedHours,
    allocatedHours,
    estimatedHours: actualEstimatedHours,
    allocatedPct,
    utilizationPct,
    utilizationStatus,
    headroomHours,
    hasCapacity: headroomHours > 0,
  };
}

// =============================================================================
// Temporal Distribution Builder
// =============================================================================

function buildTemporalDistribution(
  tasks: Array<{ id: string; dueDate: Date | null; estimatedHours: number | null }>,
  todos: Array<{ id: string; dueDate: Date | null }>,
  weekStart: Date,
  weekEnd: Date,
  nextWeekStart: Date | null,
  nextWeekEnd: Date | null
): TemporalDistributionV0 {
  const currentWeek = buildWeeklySchedule(tasks, todos, weekStart, weekEnd);
  const nextWeek =
    nextWeekStart && nextWeekEnd
      ? buildWeeklySchedule(tasks, todos, nextWeekStart, nextWeekEnd)
      : null;

  // Find deadline clusters
  const deadlineClusters: Array<{ date: string; count: number; taskIds: string[] }> = [];
  const tasksByDate = new Map<string, string[]>();

  for (const task of tasks) {
    if (task.dueDate) {
      const dateKey = task.dueDate.toISOString().split("T")[0];
      const existing = tasksByDate.get(dateKey) || [];
      existing.push(task.id);
      tasksByDate.set(dateKey, existing);
    }
  }

  for (const [date, taskIds] of tasksByDate) {
    if (taskIds.length >= DEADLINE_CLUSTER_THRESHOLD) {
      deadlineClusters.push({ date, count: taskIds.length, taskIds });
    }
  }

  return {
    currentWeek,
    nextWeek,
    deadlineClusters,
  };
}

function buildWeeklySchedule(
  tasks: Array<{ id: string; dueDate: Date | null; estimatedHours: number | null }>,
  todos: Array<{ id: string; dueDate: Date | null }>,
  weekStart: Date,
  weekEnd: Date
): WeeklyScheduleV0 {
  const days: DailyWorkloadV0[] = [];
  let totalEstimatedHours = 0;
  let peakDay: string | null = null;
  let peakHours = 0;

  // Generate days for the week
  const currentDay = new Date(weekStart);
  while (currentDay <= weekEnd) {
    const dateKey = currentDay.toISOString().split("T")[0];
    const dayOfWeek = currentDay.getDay();

    // Count tasks due on this day
    const tasksDue = tasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate.toISOString().split("T")[0] === dateKey;
    });

    // Count todos due on this day
    const todosDue = todos.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate.toISOString().split("T")[0] === dateKey;
    });

    const estimatedHours = tasksDue.reduce(
      (sum, t) => sum + (t.estimatedHours ?? 0),
      0
    );
    totalEstimatedHours += estimatedHours;

    const isOverloaded = estimatedHours > 8; // More than 8 hours in a day

    if (estimatedHours > peakHours) {
      peakHours = estimatedHours;
      peakDay = dateKey;
    }

    days.push({
      date: dateKey,
      dayOfWeek,
      tasksDue: tasksDue.length,
      todosDue: todosDue.length,
      estimatedHours,
      isOverloaded,
    });

    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Check if workload is balanced (no day has more than 2x average)
  const avgHours = totalEstimatedHours / days.length;
  const isBalanced = !days.some((d) => d.estimatedHours > avgHours * 2);

  return {
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
    days,
    totalEstimatedHours,
    peakDay,
    isBalanced,
  };
}

// =============================================================================
// Signal Detection
// =============================================================================

function detectWorkloadSignals(
  taskLoad: TaskLoadV0,
  projectLoadSummary: ProjectLoadSummaryV0,
  capacityComparison: CapacityComparisonV0,
  temporalDistribution: TemporalDistributionV0,
  tasks: Array<{ id: string; status: string; updatedAt: Date }>
): WorkloadSignalV0[] {
  const signals: WorkloadSignalV0[] = [];
  const now = new Date().toISOString();

  // Overload signals
  if (capacityComparison.utilizationStatus === "SEVERELY_OVERLOADED") {
    signals.push({
      id: randomUUID(),
      signalType: "SEVERE_OVERLOAD",
      severity: "CRITICAL",
      description: `Utilization at ${Math.round(capacityComparison.utilizationPct * 100)}% - severely overloaded`,
      affectedEntityIds: [],
      value: capacityComparison.utilizationPct,
      threshold: SEVERE_OVERLOAD_THRESHOLD,
      detectedAt: now,
    });
  } else if (capacityComparison.utilizationStatus === "OVERLOADED") {
    signals.push({
      id: randomUUID(),
      signalType: "OVERLOAD",
      severity: "HIGH",
      description: `Utilization at ${Math.round(capacityComparison.utilizationPct * 100)}% - overloaded`,
      affectedEntityIds: [],
      value: capacityComparison.utilizationPct,
      threshold: OVERLOAD_THRESHOLD,
      detectedAt: now,
    });
  }

  // Underutilized signal
  if (capacityComparison.utilizationStatus === "UNDERUTILIZED") {
    signals.push({
      id: randomUUID(),
      signalType: "UNDERUTILIZED",
      severity: "INFO",
      description: `Utilization at ${Math.round(capacityComparison.utilizationPct * 100)}% - has capacity for more work`,
      affectedEntityIds: [],
      value: capacityComparison.utilizationPct,
      threshold: UNDERUTILIZED_THRESHOLD,
      detectedAt: now,
    });
  }

  // Deadline cluster signals
  for (const cluster of temporalDistribution.deadlineClusters) {
    signals.push({
      id: randomUUID(),
      signalType: "DEADLINE_CLUSTER",
      severity: cluster.count >= 5 ? "HIGH" : "WARNING",
      description: `${cluster.count} tasks due on ${cluster.date}`,
      affectedEntityIds: cluster.taskIds,
      value: cluster.count,
      threshold: DEADLINE_CLUSTER_THRESHOLD,
      detectedAt: now,
    });
  }

  // Blocked work signal
  const blockedCount = taskLoad.byStatus.BLOCKED?.count ?? 0;
  if (blockedCount > 0) {
    const severity: SignalSeverityV0 =
      blockedCount >= 5 ? "HIGH" : blockedCount >= 2 ? "WARNING" : "INFO";
    signals.push({
      id: randomUUID(),
      signalType: "BLOCKED_WORK",
      severity,
      description: `${blockedCount} tasks are blocked`,
      affectedEntityIds: [],
      value: blockedCount,
      threshold: 1,
      detectedAt: now,
    });
  }

  // Context switching signal (too many projects)
  if (projectLoadSummary.isOverSpread) {
    signals.push({
      id: randomUUID(),
      signalType: "CONTEXT_SWITCHING",
      severity: "WARNING",
      description: `Working on ${projectLoadSummary.projectCount} projects - potential context switching overhead`,
      affectedEntityIds: [],
      value: projectLoadSummary.projectCount,
      threshold: OVERSPREAD_PROJECT_COUNT,
      detectedAt: now,
    });
  }

  // Stale tasks signal
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleTasks = tasks.filter(
    (t) =>
      t.status !== "DONE" &&
      t.status !== "CANCELLED" &&
      t.updatedAt < sevenDaysAgo
  );
  if (staleTasks.length > 0) {
    signals.push({
      id: randomUUID(),
      signalType: "STALE_TASKS",
      severity: staleTasks.length >= 5 ? "WARNING" : "INFO",
      description: `${staleTasks.length} tasks have not been updated in 7+ days`,
      affectedEntityIds: staleTasks.map((t) => t.id),
      value: staleTasks.length,
      threshold: 1,
      detectedAt: now,
    });
  }

  // Sort by severity
  const severityOrder: Record<SignalSeverityV0, number> = {
    CRITICAL: 0,
    HIGH: 1,
    WARNING: 2,
    INFO: 3,
  };
  signals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return signals;
}

// =============================================================================
// Summary Builders
// =============================================================================

function buildSignalSummary(signals: WorkloadSignalV0[]): SignalSummaryV0 {
  const byType: Partial<Record<WorkloadSignalTypeV0, number>> = {};
  const bySeverity = { info: 0, warning: 0, high: 0, critical: 0 };

  for (const signal of signals) {
    byType[signal.signalType] = (byType[signal.signalType] ?? 0) + 1;
    bySeverity[signal.severity.toLowerCase() as keyof typeof bySeverity]++;
  }

  return {
    totalCount: signals.length,
    byType,
    bySeverity,
    mostSevere: signals[0] || null,
  };
}

function buildSummary(
  taskLoad: TaskLoadV0,
  capacityComparison: CapacityComparisonV0,
  signalSummary: SignalSummaryV0
): WorkloadAnalysisSummaryV0 {
  // Determine assessment
  let assessment: WorkloadAssessmentV0;
  if (signalSummary.bySeverity.critical > 0) {
    assessment = "CRITICAL";
  } else if (
    capacityComparison.utilizationStatus === "SEVERELY_OVERLOADED" ||
    capacityComparison.utilizationStatus === "OVERLOADED"
  ) {
    assessment = "OVERLOADED";
  } else if (capacityComparison.utilizationStatus === "HIGH") {
    assessment = "HEAVY";
  } else if (capacityComparison.utilizationStatus === "UNDERUTILIZED") {
    assessment = "LIGHT";
  } else {
    assessment = "BALANCED";
  }

  // Calculate workload score (0.0 = no work, 0.5 = balanced, 1.0 = overloaded)
  const workloadScore = Math.min(1.0, capacityComparison.utilizationPct);

  // Determine primary concern
  let primaryConcern: string | null = null;
  if (signalSummary.mostSevere) {
    primaryConcern = signalSummary.mostSevere.description;
  }

  // Recommend action
  let recommendedAction: string | null = null;
  if (assessment === "CRITICAL" || assessment === "OVERLOADED") {
    recommendedAction = "Reassign or defer some tasks to reduce workload";
  } else if (assessment === "LIGHT") {
    recommendedAction = "Has capacity for additional work";
  } else if (taskLoad.overdue.count > 0) {
    recommendedAction = `Address ${taskLoad.overdue.count} overdue tasks`;
  }

  const needsAttention =
    assessment === "CRITICAL" ||
    assessment === "OVERLOADED" ||
    signalSummary.bySeverity.critical > 0 ||
    signalSummary.bySeverity.high > 0;

  return {
    assessment,
    workloadScore,
    primaryConcern,
    recommendedAction,
    needsAttention,
  };
}

// =============================================================================
// Team Workload Builder
// =============================================================================

/**
 * Build a team workload snapshot.
 */
export async function buildTeamWorkloadSnapshot(
  workspaceId: string,
  teamId: string
): Promise<TeamWorkloadSnapshotV0> {
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

    // Build individual workload snapshots
    const members: TeamMemberWorkloadV0[] = [];
    let totalTasks = 0;
    let totalBlocked = 0;
    let membersWithCapacity = 0;
    let membersOverloaded = 0;
    let totalUtilization = 0;

    for (const position of team.positions) {
      if (!position.userId) continue;

      try {
        const snapshot = await buildWorkloadAnalysis(
          workspaceId,
          position.userId,
          { includeNextWeek: false, includeWorkRequests: false }
        );

        const memberSummary: TeamMemberWorkloadV0 = {
          personId: position.userId,
          personName: position.user?.name || position.user?.email || "Unknown",
          assessment: snapshot.summary.assessment,
          utilizationPct: snapshot.capacityComparison.utilizationPct,
          taskCount: snapshot.taskLoad.totalCount,
          blockedCount: snapshot.taskLoad.byStatus.BLOCKED?.count ?? 0,
          hasCapacity: snapshot.capacityComparison.hasCapacity,
        };

        members.push(memberSummary);

        totalTasks += memberSummary.taskCount;
        totalBlocked += memberSummary.blockedCount;
        totalUtilization += memberSummary.utilizationPct;

        if (memberSummary.hasCapacity) membersWithCapacity++;
        if (
          memberSummary.assessment === "OVERLOADED" ||
          memberSummary.assessment === "CRITICAL"
        ) {
          membersOverloaded++;
        }
      } catch (error: unknown) {
        logger.warn("[WorkloadAnalysis] Failed to build member snapshot", {
          teamId,
          personId: position.userId,
          error,
        });
      }
    }

    const avgUtilization =
      members.length > 0 ? totalUtilization / members.length : 0;

    // Check if team is balanced (no one is overloaded while others have capacity)
    const isBalanced = !(membersOverloaded > 0 && membersWithCapacity > 0);

    const snapshot: TeamWorkloadSnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      teamId,
      teamName: team.name,
      members,
      teamMetrics: {
        totalMembers: members.length,
        membersWithCapacity,
        membersOverloaded,
        avgUtilizationPct: avgUtilization,
        totalTasks,
        totalBlocked,
        isBalanced,
      },
    };

    const duration = Date.now() - startTime;
    logger.info("[WorkloadAnalysis] Team snapshot built", {
      workspaceId,
      teamId,
      memberCount: members.length,
      avgUtilization: Math.round(avgUtilization * 100),
      durationMs: duration,
    });

    return snapshot;
  } catch (error: unknown) {
    logger.error("[WorkloadAnalysis] Failed to build team snapshot", {
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
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
