/**
 * Project Health Scanner
 *
 * Data-driven detection of 6 project health risk types.
 * Detection is pure computation — no LLM calls.
 * Results are persisted as ProactiveInsight records with idempotent upserts
 * deduplicated by (projectId + alertType) stored in metadata.
 *
 * Alert types:
 * 1. velocity_drop       — Task completion rate fell >30% week-over-week
 * 2. dependency_block    — Tasks blocked by unresolved dependencies
 * 3. allocation_conflict — Contributors overloaded across too many projects
 * 4. deadline_risk       — Milestone(s) due within 7 days, <50% complete
 * 5. ownership_gap       — Project has no owner assigned
 * 6. stale_project       — No task activity in 14+ days on an active project
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// =============================================================================
// Configuration Constants (tunable thresholds)
// =============================================================================

const VELOCITY_WARNING_DROP = 0.3; // 30% week-over-week drop → warning
const VELOCITY_CRITICAL_DROP = 0.5; // 50% week-over-week drop → critical
const VELOCITY_MIN_BASELINE = 2; // Minimum avg tasks/week to measure velocity
const DEADLINE_RISK_DAYS = 7; // Milestones within this many days are at risk
const DEADLINE_RISK_COMPLETION_THRESHOLD = 0.5; // Below 50% complete → at risk
const STALE_PROJECT_DAYS = 14; // No activity within this many days → stale
const ALLOCATION_CONFLICT_PROJECT_THRESHOLD = 3; // >3 concurrent projects → overloaded
const MIN_TASKS_PER_PROJECT = 3; // Skip projects with fewer tasks (empty guard)
const MAX_ALERTS_PER_WORKSPACE = 20; // Cap to prevent noise

// =============================================================================
// Public Types
// =============================================================================

export type ProjectHealthAlertType =
  | "velocity_drop"
  | "dependency_block"
  | "allocation_conflict"
  | "deadline_risk"
  | "ownership_gap"
  | "stale_project";

export type ProjectHealthAlertSeverity = "critical" | "warning" | "info";

export interface ProjectHealthAlert {
  projectId: string;
  projectName: string;
  alertType: ProjectHealthAlertType;
  severity: ProjectHealthAlertSeverity;
  title: string;
  description: string;
  /** Shallow, JSON-serializable evidence per Loopbrain contract */
  evidence: Record<string, string | number | boolean | null>;
  suggestedAction: string;
  detectedAt: Date;
}

export interface PersistResult {
  /** Newly created alerts (not previously active) */
  created: ProjectHealthAlert[];
  /** Updated alerts (were already active, refreshed) */
  updated: number;
  /** Previously active alerts that conditions no longer trigger */
  resolved: number;
}

// =============================================================================
// Internal Data Types
// =============================================================================

interface ProjectTask {
  id: string;
  status: string;
  assigneeId: string | null;
  completedAt: Date | null;
  updatedAt: Date;
  dependsOn: string[];
  blocks: string[];
  milestoneId: string | null;
}

interface ProjectMilestone {
  id: string;
  title: string;
  endDate: Date | null;
  tasks: Array<{ id: string; status: string }>;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  ownerId: string | null;
  updatedAt: Date;
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
}

// =============================================================================
// Main Scanner Entry Point
// =============================================================================

/**
 * Scan all active projects in a workspace and return health alerts.
 * Pure data analysis — no LLM calls.
 * Returns sorted by severity (critical first), capped at MAX_ALERTS_PER_WORKSPACE.
 */
export async function scanProjectHealth(
  workspaceId: string
): Promise<ProjectHealthAlert[]> {
  const now = new Date();
  const alerts: ProjectHealthAlert[] = [];

  try {
    // Load active projects with tasks and milestones in one query
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        isArchived: false,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        ownerId: true,
        updatedAt: true,
        tasks: {
          select: {
            id: true,
            status: true,
            assigneeId: true,
            completedAt: true,
            updatedAt: true,
            dependsOn: true,
            blocks: true,
            milestoneId: true,
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            endDate: true,
            tasks: {
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    // Load all open tasks across workspace for allocation conflict detection
    const allOpenTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: { notIn: ["DONE"] },
        assigneeId: { not: null },
      },
      select: { assigneeId: true, projectId: true },
    });

    // Build: assigneeId → Set of distinct projectIds with open work
    const assigneeProjects = new Map<string, Set<string>>();
    for (const task of allOpenTasks) {
      if (!task.assigneeId) continue;
      if (!assigneeProjects.has(task.assigneeId)) {
        assigneeProjects.set(task.assigneeId, new Set());
      }
      assigneeProjects.get(task.assigneeId)!.add(task.projectId);
    }

    for (const project of projects) {
      // Skip near-empty projects
      if (project.tasks.length < MIN_TASKS_PER_PROJECT) continue;

      const detected = [
        detectVelocityDrop(project, now),
        detectDependencyBlock(project, now),
        detectAllocationConflict(project, assigneeProjects, now),
        detectDeadlineRisk(project, now),
        detectOwnershipGap(project, now),
        detectStaleProject(project, now),
      ].filter((a): a is ProjectHealthAlert => a !== null);

      alerts.push(...detected);
    }

    // Sort: critical first, then warning, then info
    const severityOrder: Record<ProjectHealthAlertSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    alerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return alerts.slice(0, MAX_ALERTS_PER_WORKSPACE);
  } catch (error) {
    logger.error("[ProjectHealthScanner] Scan failed", { workspaceId, error });
    return [];
  }
}

// =============================================================================
// Detectors (pure functions — no DB calls)
// =============================================================================

function detectVelocityDrop(
  project: ProjectData,
  now: Date
): ProjectHealthAlert | null {
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = new Date(now.getTime() - oneWeekMs);
  const lastWeekStart = new Date(now.getTime() - 2 * oneWeekMs);

  const doneTasks = project.tasks.filter((t) => t.status === "DONE");
  if (doneTasks.length === 0) return null;

  const thisWeekDone = doneTasks.filter(
    (t) => t.completedAt && t.completedAt >= thisWeekStart
  ).length;
  const lastWeekDone = doneTasks.filter(
    (t) =>
      t.completedAt &&
      t.completedAt >= lastWeekStart &&
      t.completedAt < thisWeekStart
  ).length;

  const twoWeekAvg = (thisWeekDone + lastWeekDone) / 2;

  // Need a meaningful baseline to measure a drop
  if (twoWeekAvg < VELOCITY_MIN_BASELINE) return null;

  const dropFraction = (twoWeekAvg - thisWeekDone) / twoWeekAvg;
  if (dropFraction < VELOCITY_WARNING_DROP) return null;

  const severity: ProjectHealthAlertSeverity =
    dropFraction >= VELOCITY_CRITICAL_DROP ? "critical" : "warning";
  const dropPct = Math.round(dropFraction * 100);

  return {
    projectId: project.id,
    projectName: project.name,
    alertType: "velocity_drop",
    severity,
    title: `${project.name} velocity dropped ${dropPct}%`,
    description: `Task completion this week (${thisWeekDone}) is ${dropPct}% below the 2-week average of ${twoWeekAvg.toFixed(1)} tasks/week. This may indicate blockers or reduced team availability.`,
    evidence: {
      thisWeekDone,
      lastWeekDone,
      twoWeekAvg,
      dropFraction,
      dropPct,
    },
    suggestedAction: `Review what's slowing progress on ${project.name}. Check for blockers, unassigned tasks, or team availability gaps.`,
    detectedAt: now,
  };
}

function detectDependencyBlock(
  project: ProjectData,
  now: Date
): ProjectHealthAlert | null {
  const taskMap = new Map(project.tasks.map((t) => [t.id, t]));

  // Tasks that cannot proceed because their dependencies are not DONE
  const blockedTasks = project.tasks.filter(
    (t) =>
      t.dependsOn.length > 0 &&
      t.dependsOn.some((depId) => {
        const dep = taskMap.get(depId);
        return dep && dep.status !== "DONE";
      })
  );

  if (blockedTasks.length < 2) return null;

  // Tasks that are also in another task's dependency chain (cascading block)
  const dependedOnIds = new Set(project.tasks.flatMap((t) => t.dependsOn));
  const chainBlockers = blockedTasks.filter((t) => dependedOnIds.has(t.id));

  const severity: ProjectHealthAlertSeverity =
    chainBlockers.length > 0 ? "critical" : "warning";

  return {
    projectId: project.id,
    projectName: project.name,
    alertType: "dependency_block",
    severity,
    title: `${project.name} has ${blockedTasks.length} dependency-blocked tasks`,
    description: `${blockedTasks.length} tasks in ${project.name} cannot proceed because their dependencies are not complete${chainBlockers.length > 0 ? `. ${chainBlockers.length} of these are also blocking other tasks, creating a cascading delay` : ""}.`,
    evidence: {
      blockedTaskCount: blockedTasks.length,
      chainBlockerCount: chainBlockers.length,
      totalTasks: project.tasks.length,
    },
    suggestedAction: `Review and resolve the ${blockedTasks.length} blocked tasks. Focus on unblocking chain dependencies first to restore momentum.`,
    detectedAt: now,
  };
}

function detectAllocationConflict(
  project: ProjectData,
  assigneeProjects: Map<string, Set<string>>,
  now: Date
): ProjectHealthAlert | null {
  const activeAssignees = new Set(
    project.tasks
      .filter((t) => t.status !== "DONE" && t.assigneeId)
      .map((t) => t.assigneeId!)
  );

  const overloaded = [...activeAssignees].filter(
    (userId) =>
      (assigneeProjects.get(userId)?.size ?? 0) >
      ALLOCATION_CONFLICT_PROJECT_THRESHOLD
  );

  if (overloaded.length === 0) return null;

  const severity: ProjectHealthAlertSeverity =
    overloaded.length > 1 ? "warning" : "info";

  return {
    projectId: project.id,
    projectName: project.name,
    alertType: "allocation_conflict",
    severity,
    title: `${project.name} has ${overloaded.length} overloaded contributor${overloaded.length > 1 ? "s" : ""}`,
    description: `${overloaded.length} contributor${overloaded.length > 1 ? "s are" : " is"} assigned to open tasks on ${project.name} while also having open work on more than ${ALLOCATION_CONFLICT_PROJECT_THRESHOLD} other projects. This may cause delays.`,
    evidence: {
      overloadedMemberCount: overloaded.length,
      projectThreshold: ALLOCATION_CONFLICT_PROJECT_THRESHOLD,
    },
    suggestedAction: `Consider redistributing tasks from overloaded contributors or reducing their cross-project commitments.`,
    detectedAt: now,
  };
}

function detectDeadlineRisk(
  project: ProjectData,
  now: Date
): ProjectHealthAlert | null {
  const deadlineWindow = new Date(
    now.getTime() + DEADLINE_RISK_DAYS * 24 * 60 * 60 * 1000
  );

  const atRisk = project.milestones
    .filter((m) => m.endDate && m.endDate > now && m.endDate <= deadlineWindow)
    .filter((m) => {
      if (m.tasks.length === 0) return false;
      const done = m.tasks.filter((t) => t.status === "DONE").length;
      return done / m.tasks.length < DEADLINE_RISK_COMPLETION_THRESHOLD;
    })
    .map((m) => {
      const done = m.tasks.filter((t) => t.status === "DONE").length;
      const daysLeft = Math.ceil(
        (m.endDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        ...m,
        done,
        daysLeft,
        completionRate: done / m.tasks.length,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (atRisk.length === 0) return null;

  const mostUrgent = atRisk[0];
  const severity: ProjectHealthAlertSeverity =
    mostUrgent.daysLeft <= 3 ? "critical" : "warning";

  const titleSuffix =
    atRisk.length === 1
      ? `milestone "${mostUrgent.title}" is ${Math.round(mostUrgent.completionRate * 100)}% done with ${mostUrgent.daysLeft}d left`
      : `${atRisk.length} milestones at risk within ${DEADLINE_RISK_DAYS} days`;

  const description =
    atRisk.length === 1
      ? `Milestone "${mostUrgent.title}" is due in ${mostUrgent.daysLeft} days but only ${Math.round(mostUrgent.completionRate * 100)}% of its ${mostUrgent.tasks.length} tasks are complete. At current pace it will likely miss the deadline.`
      : `${atRisk.length} milestones are approaching their deadlines within ${DEADLINE_RISK_DAYS} days. Most urgent: "${mostUrgent.title}" (${mostUrgent.daysLeft}d remaining, ${Math.round(mostUrgent.completionRate * 100)}% complete).`;

  return {
    projectId: project.id,
    projectName: project.name,
    alertType: "deadline_risk",
    severity,
    title: `${project.name}: ${titleSuffix}`,
    description,
    evidence: {
      atRiskMilestoneCount: atRisk.length,
      mostUrgentDaysLeft: mostUrgent.daysLeft,
      mostUrgentCompletionRate: mostUrgent.completionRate,
      mostUrgentTitle: mostUrgent.title,
      mostUrgentTotalTasks: mostUrgent.tasks.length,
      mostUrgentDoneTasks: mostUrgent.done,
    },
    suggestedAction: `Accelerate work on the ${atRisk.length} at-risk milestone${atRisk.length > 1 ? "s" : ""} or negotiate timeline extensions.`,
    detectedAt: now,
  };
}

function detectOwnershipGap(
  project: ProjectData,
  now: Date
): ProjectHealthAlert | null {
  if (project.ownerId) return null;

  const openTasks = project.tasks.filter((t) => t.status !== "DONE").length;

  return {
    projectId: project.id,
    projectName: project.name,
    alertType: "ownership_gap",
    severity: "warning",
    title: `${project.name} has no owner assigned`,
    description: `${project.name} has ${openTasks} open tasks but no owner. Unowned projects tend to lose accountability, miss deadlines, and accumulate unresolved blockers.`,
    evidence: {
      openTasks,
      totalTasks: project.tasks.length,
      hasOwner: false,
    },
    suggestedAction: `Assign an owner to ${project.name} to ensure accountability and clear decision-making authority.`,
    detectedAt: now,
  };
}

function detectStaleProject(
  project: ProjectData,
  now: Date
): ProjectHealthAlert | null {
  const staleThreshold = new Date(
    now.getTime() - STALE_PROJECT_DAYS * 24 * 60 * 60 * 1000
  );

  const hasRecentActivity = project.tasks.some(
    (t) => t.updatedAt > staleThreshold
  );
  if (hasRecentActivity) return null;

  if (project.updatedAt >= staleThreshold) return null;

  const openTasks = project.tasks.filter((t) => t.status !== "DONE").length;

  // If all tasks are done, skip — it's just an unclosed project
  if (openTasks === 0) return null;

  const daysSince = Math.floor(
    (now.getTime() - project.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
  );

  return {
    projectId: project.id,
    projectName: project.name,
    alertType: "stale_project",
    severity: "warning",
    title: `${project.name} has had no activity for ${daysSince} days`,
    description: `No tasks in ${project.name} have been updated in over ${STALE_PROJECT_DAYS} days, yet there are ${openTasks} open tasks. The project may be stalled or abandoned.`,
    evidence: {
      daysSinceLastActivity: daysSince,
      openTasks,
      totalTasks: project.tasks.length,
      staleThresholdDays: STALE_PROJECT_DAYS,
    },
    suggestedAction: `Check in with the ${project.name} team. If the project is on hold, update its status. If active, reassign open tasks to keep it moving.`,
    detectedAt: now,
  };
}

// =============================================================================
// Persistence — Idempotent Upsert
// =============================================================================

/**
 * Persist health alerts as ProactiveInsight records.
 *
 * - Creates new insights for new alert conditions
 * - Updates (refreshes) existing insights that are still active
 * - Marks previously-active insights as RESOLVED when conditions clear
 *
 * Deduplication key: metadata.alertType + affectedEntities[0].entityId
 */
export async function persistProjectHealthAlerts(
  workspaceId: string,
  alerts: ProjectHealthAlert[]
): Promise<PersistResult> {
  const result: PersistResult = { created: [], updated: 0, resolved: 0 };
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h TTL

  try {
    // Load all existing ACTIVE project health insights for this workspace
    const existing = await prisma.proactiveInsight.findMany({
      where: { workspaceId, category: "PROJECT", status: "ACTIVE" },
      select: { id: true, metadata: true, affectedEntities: true },
    });

    // Build dedup map: "projectId:alertType" → insight id
    const existingMap = new Map<string, string>();
    for (const insight of existing) {
      const meta = insight.metadata as Record<string, unknown> | null;
      const entities = insight.affectedEntities as
        | Array<{ entityId?: string }>
        | null;
      const alertType = meta?.alertType;
      const entityId = entities?.[0]?.entityId;
      if (typeof alertType === "string" && typeof entityId === "string") {
        existingMap.set(`${entityId}:${alertType}`, insight.id);
      }
    }

    const matchedIds = new Set<string>();

    for (const alert of alerts) {
      const key = `${alert.projectId}:${alert.alertType}`;
      const existingId = existingMap.get(key);

      const insightData = {
        title: alert.title,
        description: alert.description,
        priority: severityToPriority(alert.severity),
        trigger: alert.severity === "critical" ? "THRESHOLD_BREACH" : "PATTERN_DETECTED",
        confidence: 0.87,
        status: "ACTIVE",
        expiresAt,
        recommendations: [
          {
            id: randomUUID(),
            action: alert.suggestedAction,
            actionType: "REVIEW",
            deepLink: `/projects/${alert.projectId}`,
            confidence: 0.85,
          },
        ] as object,
        evidence: Object.entries(alert.evidence).map(([k, v]) => ({
          path: `project.health.${k}`,
          value: v,
        })) as object,
        affectedEntities: [
          {
            entityType: "PROJECT",
            entityId: alert.projectId,
            label: alert.projectName,
            impact: alert.title,
          },
        ] as object,
        metadata: {
          alertType: alert.alertType,
          suggestedAction: alert.suggestedAction,
        } as object,
      };

      if (existingId) {
        await prisma.proactiveInsight.update({
          where: { id: existingId },
          data: insightData,
        });
        matchedIds.add(existingId);
        result.updated++;
      } else {
        await prisma.proactiveInsight.create({
          data: {
            workspaceId,
            category: "PROJECT",
            ...insightData,
          },
        });
        result.created.push(alert);
      }
    }

    // Resolve insights whose conditions no longer trigger
    const toResolve = [...existingMap.values()].filter(
      (id) => !matchedIds.has(id)
    );
    if (toResolve.length > 0) {
      await prisma.proactiveInsight.updateMany({
        where: { id: { in: toResolve } },
        data: { status: "RESOLVED" },
      });
      result.resolved = toResolve.length;
    }

    logger.info("[ProjectHealthScanner] Persistence complete", {
      workspaceId,
      created: result.created.length,
      updated: result.updated,
      resolved: result.resolved,
    });
  } catch (error) {
    logger.error("[ProjectHealthScanner] Persistence failed", {
      workspaceId,
      error,
    });
  }

  return result;
}

// =============================================================================
// Notifications — Critical Alerts Only
// =============================================================================

/**
 * Create Notification records for newly detected critical project health alerts.
 * Recipients: all workspace ADMIN/OWNER members + the project owner (if set).
 * Only called for alerts that are newly created (not re-triggered updates).
 */
export async function createCriticalAlertNotifications(
  workspaceId: string,
  newCriticalAlerts: ProjectHealthAlert[]
): Promise<void> {
  if (newCriticalAlerts.length === 0) return;

  try {
    const adminMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: { in: ["ADMIN", "OWNER"] } },
      select: { userId: true },
    });

    for (const alert of newCriticalAlerts) {
      const recipientIds = new Set(adminMembers.map((m) => m.userId));

      // Also notify the project owner if they exist and differ from admins
      const project = await prisma.project.findUnique({
        where: { id: alert.projectId },
        select: { ownerId: true },
      });
      if (project?.ownerId) {
        recipientIds.add(project.ownerId);
      }

      if (recipientIds.size === 0) continue;

      await prisma.notification.createMany({
        data: [...recipientIds].map((recipientId) => ({
          workspaceId,
          recipientId,
          type: "PROJECT_HEALTH_CRITICAL",
          title: alert.title,
          body: alert.description,
          entityType: "PROJECT",
          entityId: alert.projectId,
          url: `/projects/${alert.projectId}`,
        })),
      });
    }

    logger.info("[ProjectHealthScanner] Critical notifications sent", {
      workspaceId,
      alertCount: newCriticalAlerts.length,
    });
  } catch (error) {
    logger.error("[ProjectHealthScanner] Notification creation failed", {
      workspaceId,
      error,
    });
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

function severityToPriority(severity: ProjectHealthAlertSeverity): string {
  switch (severity) {
    case "critical":
      return "CRITICAL";
    case "warning":
      return "HIGH";
    case "info":
      return "MEDIUM";
  }
}
