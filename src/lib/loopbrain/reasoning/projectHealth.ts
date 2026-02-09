/**
 * Project Health Reasoning
 *
 * Builds ProjectHealthSnapshotV0 by analyzing project data including
 * tasks, epics, milestones, allocations, and historical metrics.
 *
 * @see src/lib/loopbrain/contract/projectHealth.v0.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type {
  ProjectHealthSnapshotV0,
  ProjectVelocityV0,
  ProjectProgressV0,
  TaskProgressV0,
  EpicProgressV0,
  MilestoneProgressV0,
  ProjectRiskV0,
  ProjectRiskTypeV0,
  RiskSeverityV0,
  ResourceHealthV0,
  MemberAllocationV0,
  ResourceBottleneckV0,
  ProjectMomentumV0,
  TrendDirectionV0,
  ProjectBlockerV0,
  BlockerTypeV0,
  ProjectHealthSummaryV0,
  OverallHealthV0,
} from "../contract/projectHealth.v0";

// =============================================================================
// Types
// =============================================================================

interface BuildOptions {
  /** Include historical velocity analysis */
  includeHistory?: boolean;
  /** Number of weeks for velocity calculation */
  velocityWeeks?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_VELOCITY_WEEKS = 4;
const BLOCKED_TASK_RISK_THRESHOLD = 0.1; // 10% blocked = risk
const UNASSIGNED_TASK_RISK_THRESHOLD = 0.2; // 20% unassigned = risk
const VELOCITY_DECLINE_THRESHOLD = -0.2; // 20% decline = risk
const DAYS_BLOCKED_HIGH_SEVERITY = 3;
const DAYS_BLOCKED_CRITICAL_SEVERITY = 7;

// =============================================================================
// Main Builder Function
// =============================================================================

/**
 * Build a project health snapshot.
 */
export async function buildProjectHealthSnapshot(
  workspaceId: string,
  projectId: string,
  options: BuildOptions = {}
): Promise<ProjectHealthSnapshotV0> {
  const startTime = Date.now();
  const { includeHistory = true, velocityWeeks = DEFAULT_VELOCITY_WEEKS } = options;

  try {
    const now = new Date();
    const velocityStartDate = new Date(
      now.getTime() - velocityWeeks * 7 * 24 * 60 * 60 * 1000
    );

    // Load all project data in parallel
    const [project, tasks, epics, milestones, allocations, recentCompletions] =
      await Promise.all([
        // Project info
        prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            name: true,
            status: true,
          },
        }),
        // All tasks (uses 'points' not 'storyPoints')
        prisma.task.findMany({
          where: { workspaceId, projectId },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            dueDate: true,
            points: true,
            createdAt: true,
            updatedAt: true,
            completedAt: true,
            dependsOn: true,
            blocks: true,
          },
        }),
        // Epics (don't have status field, use title not name)
        prisma.epic.findMany({
          where: { workspaceId, projectId },
          select: {
            id: true,
            title: true,
            tasks: { select: { status: true } },
          },
        }),
        // Milestones (use endDate not dueDate, no completedAt)
        prisma.milestone.findMany({
          where: { workspaceId, projectId },
          select: {
            id: true,
            title: true,
            endDate: true,
          },
        }),
        // Work allocations (use contextType/contextId, not projectId)
        prisma.workAllocation.findMany({
          where: {
            workspaceId,
            contextType: "PROJECT",
            contextId: projectId,
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            startDate: { lte: now },
          },
          select: {
            id: true,
            personId: true,
            allocationPercent: true,
          },
        }),
        // Recent completions for velocity
        includeHistory
          ? prisma.task.findMany({
              where: {
                workspaceId,
                projectId,
                status: "DONE",
                completedAt: { gte: velocityStartDate },
              },
              select: {
                id: true,
                points: true,
                completedAt: true,
              },
            })
          : [],
      ]);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Transform tasks to expected format (map points to storyPoints)
    const transformedTasks = tasks.map((t) => ({
      ...t,
      storyPoints: t.points,
    }));

    // Transform epics to expected format (add status based on tasks)
    const transformedEpics = epics.map((e) => {
      const taskStatuses = e.tasks.map((t) => t.status);
      const allDone = taskStatuses.length > 0 && taskStatuses.every((s) => s === "DONE");
      const anyInProgress = taskStatuses.some((s) => s === "IN_PROGRESS");
      const status = allDone ? "DONE" : anyInProgress ? "IN_PROGRESS" : "TODO";
      return {
        id: e.id,
        name: e.title,
        status,
        tasks: e.tasks,
      };
    });

    // Transform milestones to expected format
    const transformedMilestones = milestones.map((m) => ({
      id: m.id,
      name: m.title,
      dueDate: m.endDate,
      completedAt: null as Date | null, // Milestone doesn't have completedAt
    }));

    // Transform allocations to expected format
    const transformedAllocations = allocations.map((a) => ({
      personId: a.personId,
      allocationPercent: a.allocationPercent,
      person: { user: { name: null as string | null, email: "" } },
    }));

    // Transform recent completions
    const transformedRecentCompletions = recentCompletions.map((t) => ({
      storyPoints: t.points,
      completedAt: t.completedAt,
    }));

    // Build velocity metrics
    const velocity = buildVelocity(transformedTasks, transformedRecentCompletions, velocityWeeks);

    // Build progress metrics
    const progress = buildProgress(transformedTasks, transformedEpics, transformedMilestones, now);

    // Build resource health
    const resourceHealth = buildResourceHealth(transformedTasks, transformedAllocations);

    // Detect risks
    const risks = detectRisks(transformedTasks, progress, velocity, resourceHealth, now);

    // Build momentum
    const momentum = buildMomentum(transformedRecentCompletions, velocityWeeks);

    // Detect blockers
    const blockers = detectBlockers(transformedTasks, now);

    // Build summary
    const summary = buildSummary(
      progress,
      risks,
      blockers,
      transformedMilestones,
      velocity,
      now
    );

    // Map project status (no ARCHIVED in ProjectStatus enum)
    let projectStatus: ProjectHealthSnapshotV0["projectStatus"] = "ACTIVE";
    if (project.status === "COMPLETED") projectStatus = "COMPLETED";
    else if (project.status === "CANCELLED") projectStatus = "CANCELLED";
    else if (project.status === "ON_HOLD") projectStatus = "ON_HOLD";

    const snapshot: ProjectHealthSnapshotV0 = {
      schemaVersion: "v0",
      generatedAt: new Date().toISOString(),
      workspaceId,
      projectId,
      projectName: project.name,
      projectStatus,
      velocity,
      progress,
      risks,
      resourceHealth,
      momentum,
      blockers,
      summary,
    };

    const duration = Date.now() - startTime;
    logger.info("[ProjectHealth] Snapshot built", {
      workspaceId,
      projectId,
      overallHealth: summary.overallHealth,
      taskCount: transformedTasks.length,
      riskCount: risks.length,
      durationMs: duration,
    });

    return snapshot;
  } catch (error) {
    logger.error("[ProjectHealth] Failed to build snapshot", {
      workspaceId,
      projectId,
      error,
    });
    throw error;
  }
}

// =============================================================================
// Velocity Builder
// =============================================================================

function buildVelocity(
  tasks: Array<{
    status: string;
    storyPoints: number | null;
    completedAt: Date | null;
    createdAt: Date;
  }>,
  recentCompletions: Array<{
    storyPoints: number | null;
    completedAt: Date | null;
  }>,
  velocityWeeks: number
): ProjectVelocityV0 {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // Calculate throughput
  const tasksPerWeek =
    velocityWeeks > 0 ? recentCompletions.length / velocityWeeks : 0;
  const totalPoints = recentCompletions.reduce(
    (sum, t) => sum + (t.storyPoints ?? 0),
    0
  );
  const pointsPerWeek =
    velocityWeeks > 0 && totalPoints > 0 ? totalPoints / velocityWeeks : null;

  // Calculate cycle time (simplified - using completed tasks)
  const completedWithDates = tasks.filter(
    (t) => t.status === "DONE" && t.completedAt
  );
  let avgDays = 0;
  let p50Days = 0;
  let p90Days = 0;

  if (completedWithDates.length > 0) {
    const cycleTimes = completedWithDates.map((t) => {
      const created = new Date(t.createdAt);
      const completed = new Date(t.completedAt!);
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    });
    cycleTimes.sort((a, b) => a - b);

    avgDays = cycleTimes.reduce((sum, d) => sum + d, 0) / cycleTimes.length;
    p50Days = cycleTimes[Math.floor(cycleTimes.length * 0.5)] ?? 0;
    p90Days = cycleTimes[Math.floor(cycleTimes.length * 0.9)] ?? 0;
  }

  return {
    completionRate,
    throughput: {
      tasksPerWeek: Math.round(tasksPerWeek * 10) / 10,
      pointsPerWeek: pointsPerWeek ? Math.round(pointsPerWeek * 10) / 10 : null,
    },
    cycleTime: {
      avgDays: Math.round(avgDays * 10) / 10,
      p50Days: Math.round(p50Days * 10) / 10,
      p90Days: Math.round(p90Days * 10) / 10,
    },
  };
}

// =============================================================================
// Progress Builder
// =============================================================================

function buildProgress(
  tasks: Array<{ status: string }>,
  epics: Array<{ status: string; tasks: Array<{ status: string }> }>,
  milestones: Array<{ dueDate: Date | null; completedAt: Date | null }>,
  now: Date
): ProjectProgressV0 {
  // Task progress
  const taskProgress: TaskProgressV0 = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "DONE").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    blocked: tasks.filter((t) => t.status === "BLOCKED").length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    inReview: tasks.filter((t) => t.status === "IN_REVIEW").length,
  };

  // Epic progress
  const epicProgress: EpicProgressV0 = {
    total: epics.length,
    completed: epics.filter((e) => e.status === "DONE").length,
    inProgress: epics.filter((e) => e.status === "IN_PROGRESS").length,
    notStarted: epics.filter((e) => e.status === "TODO").length,
  };

  // Milestone progress
  const completedMilestones = milestones.filter((m) => m.completedAt !== null);
  const upcomingMilestones = milestones.filter(
    (m) => m.completedAt === null && m.dueDate && m.dueDate >= now
  );
  const overdueMilestones = milestones.filter(
    (m) => m.completedAt === null && m.dueDate && m.dueDate < now
  );

  const nextMilestone = upcomingMilestones
    .filter((m) => m.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0];

  const milestoneProgress: MilestoneProgressV0 = {
    total: milestones.length,
    completed: completedMilestones.length,
    upcoming: upcomingMilestones.length,
    overdue: overdueMilestones.length,
    nextDueDate: nextMilestone?.dueDate?.toISOString() ?? null,
  };

  return {
    tasks: taskProgress,
    epics: epicProgress,
    milestones: milestoneProgress,
  };
}

// =============================================================================
// Resource Health Builder
// =============================================================================

function buildResourceHealth(
  tasks: Array<{
    id: string;
    status: string;
    assigneeId: string | null;
  }>,
  allocations: Array<{
    personId: string;
    allocationPercent: number;
    person: { user: { name: string | null; email: string } };
  }>
): ResourceHealthV0 {
  // Build member allocations
  const memberAllocations: MemberAllocationV0[] = [];
  const tasksByAssignee = new Map<string, { assigned: number; completed: number }>();

  for (const task of tasks) {
    if (task.assigneeId) {
      const existing = tasksByAssignee.get(task.assigneeId) || {
        assigned: 0,
        completed: 0,
      };
      existing.assigned++;
      if (task.status === "DONE") existing.completed++;
      tasksByAssignee.set(task.assigneeId, existing);
    }
  }

  let totalUtilization = 0;
  for (const alloc of allocations) {
    const taskCounts = tasksByAssignee.get(alloc.personId) || {
      assigned: 0,
      completed: 0,
    };
    memberAllocations.push({
      personId: alloc.personId,
      personName: alloc.person.user.name || alloc.person.user.email,
      allocationPct: alloc.allocationPercent,
      assignedTaskCount: taskCounts.assigned,
      completedTaskCount: taskCounts.completed,
    });
    totalUtilization += alloc.allocationPercent;
  }

  // Detect bottlenecks (people with many blocked tasks)
  const bottlenecks: ResourceBottleneckV0[] = [];
  for (const alloc of allocations) {
    const blockedTasks = tasks.filter(
      (t) => t.assigneeId === alloc.personId && t.status === "BLOCKED"
    );
    if (blockedTasks.length >= 2) {
      bottlenecks.push({
        personId: alloc.personId,
        personName: alloc.person.user.name || alloc.person.user.email,
        blockedTaskCount: blockedTasks.length,
        reason: `${blockedTasks.length} tasks blocked`,
      });
    }
  }

  const unassignedTaskCount = tasks.filter((t) => !t.assigneeId).length;

  return {
    teamSize: allocations.length,
    utilizationPct:
      allocations.length > 0 ? totalUtilization / allocations.length : 0,
    memberAllocations,
    bottlenecks,
    unassignedTaskCount,
  };
}

// =============================================================================
// Risk Detection
// =============================================================================

function detectRisks(
  tasks: Array<{ status: string; dueDate: Date | null; assigneeId: string | null }>,
  progress: ProjectProgressV0,
  velocity: ProjectVelocityV0,
  resourceHealth: ResourceHealthV0,
  now: Date
): ProjectRiskV0[] {
  const risks: ProjectRiskV0[] = [];
  const nowIso = now.toISOString();

  // Blocked tasks risk
  if (progress.tasks.total > 0) {
    const blockedRatio = progress.tasks.blocked / progress.tasks.total;
    if (blockedRatio >= BLOCKED_TASK_RISK_THRESHOLD) {
      const severity: RiskSeverityV0 =
        blockedRatio >= 0.2 ? "HIGH" : "MEDIUM";
      risks.push({
        id: randomUUID(),
        riskType: "BLOCKED_TASKS",
        severity,
        description: `${Math.round(blockedRatio * 100)}% of tasks are blocked (${progress.tasks.blocked} tasks)`,
        affectedEntityIds: [],
        detectedAt: nowIso,
      });
    }
  }

  // Unassigned tasks risk
  if (progress.tasks.total > 0) {
    const unassignedRatio =
      resourceHealth.unassignedTaskCount / progress.tasks.total;
    if (unassignedRatio >= UNASSIGNED_TASK_RISK_THRESHOLD) {
      risks.push({
        id: randomUUID(),
        riskType: "RESOURCE_SHORTAGE",
        severity: unassignedRatio >= 0.3 ? "HIGH" : "MEDIUM",
        description: `${Math.round(unassignedRatio * 100)}% of tasks are unassigned (${resourceHealth.unassignedTaskCount} tasks)`,
        affectedEntityIds: [],
        detectedAt: nowIso,
      });
    }
  }

  // Deadline at risk (overdue milestones)
  if (progress.milestones.overdue > 0) {
    risks.push({
      id: randomUUID(),
      riskType: "DEADLINE_AT_RISK",
      severity: progress.milestones.overdue > 1 ? "CRITICAL" : "HIGH",
      description: `${progress.milestones.overdue} milestone(s) are overdue`,
      affectedEntityIds: [],
      detectedAt: nowIso,
    });
  }

  // Bottleneck risk
  if (resourceHealth.bottlenecks.length > 0) {
    risks.push({
      id: randomUUID(),
      riskType: "RESOURCE_SHORTAGE",
      severity: resourceHealth.bottlenecks.length > 2 ? "HIGH" : "MEDIUM",
      description: `${resourceHealth.bottlenecks.length} team member(s) are bottlenecked`,
      affectedEntityIds: resourceHealth.bottlenecks.map((b) => b.personId),
      detectedAt: nowIso,
    });
  }

  return risks;
}

// =============================================================================
// Momentum Builder
// =============================================================================

function buildMomentum(
  recentCompletions: Array<{
    storyPoints: number | null;
    completedAt: Date | null;
  }>,
  velocityWeeks: number
): ProjectMomentumV0 {
  // Split completions into two halves for trend analysis
  const halfWeeks = Math.floor(velocityWeeks / 2);
  const now = Date.now();
  const midpoint = now - halfWeeks * 7 * 24 * 60 * 60 * 1000;

  const firstHalf = recentCompletions.filter(
    (c) => c.completedAt && c.completedAt.getTime() < midpoint
  );
  const secondHalf = recentCompletions.filter(
    (c) => c.completedAt && c.completedAt.getTime() >= midpoint
  );

  const firstHalfRate = firstHalf.length / halfWeeks || 0;
  const secondHalfRate = secondHalf.length / halfWeeks || 0;

  const firstHalfPoints = firstHalf.reduce(
    (sum, c) => sum + (c.storyPoints ?? 0),
    0
  );
  const secondHalfPoints = secondHalf.reduce(
    (sum, c) => sum + (c.storyPoints ?? 0),
    0
  );

  const tasksPerWeekDelta = secondHalfRate - firstHalfRate;
  const pointsPerWeekDelta =
    firstHalfPoints > 0 || secondHalfPoints > 0
      ? (secondHalfPoints - firstHalfPoints) / halfWeeks
      : null;

  const percentChange =
    firstHalfRate > 0 ? (secondHalfRate - firstHalfRate) / firstHalfRate : 0;

  // Determine trend direction
  let trendDirection: TrendDirectionV0;
  if (Math.abs(percentChange) < 0.1) {
    trendDirection = "STABLE";
  } else if (percentChange > 0.1) {
    trendDirection = "IMPROVING";
  } else if (percentChange < -0.1) {
    trendDirection = "DECLINING";
  } else {
    trendDirection = "VOLATILE";
  }

  return {
    trendDirection,
    velocityDelta: {
      tasksPerWeekDelta: Math.round(tasksPerWeekDelta * 10) / 10,
      pointsPerWeekDelta: pointsPerWeekDelta
        ? Math.round(pointsPerWeekDelta * 10) / 10
        : null,
      percentChange: Math.round(percentChange * 100) / 100,
    },
    streakWeeks: 0, // Would need more historical data
    confidence: recentCompletions.length > 10 ? 0.8 : 0.5,
  };
}

// =============================================================================
// Blocker Detection
// =============================================================================

function detectBlockers(
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: Date;
    dependsOn: string[];
    blocks: string[];
  }>,
  now: Date
): ProjectBlockerV0[] {
  const blockers: ProjectBlockerV0[] = [];

  for (const task of tasks) {
    if (task.status === "BLOCKED") {
      const daysBlocked = Math.floor(
        (now.getTime() - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Determine blocker type
      let blockerType: BlockerTypeV0 = "TECHNICAL";
      if (task.dependsOn.length > 0) {
        blockerType = "DEPENDENCY";
      }

      blockers.push({
        id: randomUUID(),
        blockerType,
        description: `Task "${task.title}" has been blocked for ${daysBlocked} days`,
        blockedTaskIds: [task.id, ...task.blocks],
        daysBlocked,
        estimatedImpactDays: daysBlocked > 3 ? daysBlocked : null,
      });
    }
  }

  // Sort by days blocked descending
  blockers.sort((a, b) => b.daysBlocked - a.daysBlocked);

  return blockers;
}

// =============================================================================
// Summary Builder
// =============================================================================

function buildSummary(
  progress: ProjectProgressV0,
  risks: ProjectRiskV0[],
  blockers: ProjectBlockerV0[],
  milestones: Array<{ dueDate: Date | null; completedAt: Date | null }>,
  velocity: ProjectVelocityV0,
  now: Date
): ProjectHealthSummaryV0 {
  // Calculate health score (0-1)
  let healthScore = 1.0;

  // Deduct for blocked tasks
  if (progress.tasks.total > 0) {
    const blockedRatio = progress.tasks.blocked / progress.tasks.total;
    healthScore -= blockedRatio * 0.3;
  }

  // Deduct for risks
  const criticalRisks = risks.filter((r) => r.severity === "CRITICAL").length;
  const highRisks = risks.filter((r) => r.severity === "HIGH").length;
  healthScore -= criticalRisks * 0.2;
  healthScore -= highRisks * 0.1;

  // Deduct for blockers
  healthScore -= Math.min(0.2, blockers.length * 0.05);

  // Deduct for overdue milestones
  healthScore -= progress.milestones.overdue * 0.15;

  // Ensure score is in valid range
  healthScore = Math.max(0, Math.min(1, healthScore));

  // Determine overall health
  let overallHealth: OverallHealthV0;
  if (healthScore >= 0.8) {
    overallHealth = "EXCELLENT";
  } else if (healthScore >= 0.6) {
    overallHealth = "GOOD";
  } else if (healthScore >= 0.4) {
    overallHealth = "AT_RISK";
  } else {
    overallHealth = "CRITICAL";
  }

  // Calculate days to next milestone
  const upcomingMilestones = milestones.filter(
    (m) => m.completedAt === null && m.dueDate && m.dueDate >= now
  );
  const nextMilestone = upcomingMilestones
    .filter((m) => m.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0];

  const daysToNextMilestone = nextMilestone?.dueDate
    ? Math.ceil(
        (nextMilestone.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
    : null;

  // Determine if on track
  const onTrack =
    overallHealth !== "CRITICAL" &&
    progress.milestones.overdue === 0 &&
    velocity.completionRate > 0.3;

  return {
    overallHealth,
    healthScore: Math.round(healthScore * 100) / 100,
    activeRiskCount: risks.length,
    activeBlockerCount: blockers.length,
    daysToNextMilestone,
    onTrack,
  };
}

// =============================================================================
// Batch Builder
// =============================================================================

/**
 * Build health snapshots for multiple projects.
 */
export async function buildMultipleProjectHealthSnapshots(
  workspaceId: string,
  projectIds: string[],
  options: BuildOptions = {}
): Promise<ProjectHealthSnapshotV0[]> {
  const snapshots: ProjectHealthSnapshotV0[] = [];

  for (const projectId of projectIds) {
    try {
      const snapshot = await buildProjectHealthSnapshot(
        workspaceId,
        projectId,
        options
      );
      snapshots.push(snapshot);
    } catch (error) {
      logger.warn("[ProjectHealth] Failed to build snapshot for project", {
        workspaceId,
        projectId,
        error,
      });
    }
  }

  return snapshots;
}
