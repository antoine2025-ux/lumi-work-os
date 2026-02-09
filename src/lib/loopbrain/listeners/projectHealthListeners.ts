/**
 * Project Health Event Listeners
 *
 * Listens for project-related events and triggers health snapshot
 * regeneration when relevant changes occur.
 *
 * @see src/lib/loopbrain/reasoning/projectHealth.ts
 */

import { logger } from "@/lib/logger";
import { buildProjectHealthSnapshot } from "../reasoning/projectHealth";

// =============================================================================
// Types
// =============================================================================

interface ProjectEvent {
  type: string;
  workspaceId: string;
  projectId: string;
  entityId?: string;
  entityType?: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * In-memory cache for project health snapshots.
 * Key: `${workspaceId}:${projectId}`
 */
const healthSnapshotCache = new Map<
  string,
  {
    snapshot: unknown;
    generatedAt: Date;
    expiresAt: Date;
  }
>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the health snapshot cache for a project.
 */
export function invalidateProjectHealthCache(
  workspaceId: string,
  projectId: string
): void {
  const cacheKey = `${workspaceId}:${projectId}`;
  healthSnapshotCache.delete(cacheKey);
  logger.debug("[ProjectHealthListener] Cache invalidated", {
    workspaceId,
    projectId,
  });
}

/**
 * Get cached health snapshot if available and not expired.
 */
export function getCachedProjectHealth(
  workspaceId: string,
  projectId: string
): unknown | null {
  const cacheKey = `${workspaceId}:${projectId}`;
  const cached = healthSnapshotCache.get(cacheKey);

  if (cached && cached.expiresAt > new Date()) {
    return cached.snapshot;
  }

  // Remove expired entry
  if (cached) {
    healthSnapshotCache.delete(cacheKey);
  }

  return null;
}

/**
 * Cache a health snapshot.
 */
export function cacheProjectHealth(
  workspaceId: string,
  projectId: string,
  snapshot: unknown
): void {
  const cacheKey = `${workspaceId}:${projectId}`;
  const now = new Date();
  healthSnapshotCache.set(cacheKey, {
    snapshot,
    generatedAt: now,
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
  });
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle project-related events that should trigger health recalculation.
 */
export async function handleProjectEvent(event: ProjectEvent): Promise<void> {
  const { type, workspaceId, projectId } = event;

  // Events that should invalidate health cache
  const invalidatingEvents = [
    "task.created",
    "task.updated",
    "task.deleted",
    "task.status_changed",
    "task.assigned",
    "epic.created",
    "epic.updated",
    "epic.deleted",
    "milestone.created",
    "milestone.updated",
    "milestone.completed",
    "allocation.created",
    "allocation.updated",
    "allocation.deleted",
  ];

  if (invalidatingEvents.includes(type)) {
    invalidateProjectHealthCache(workspaceId, projectId);

    logger.debug("[ProjectHealthListener] Event processed", {
      eventType: type,
      workspaceId,
      projectId,
    });
  }
}

/**
 * Handle task status change events.
 */
export async function handleTaskStatusChange(
  workspaceId: string,
  projectId: string,
  taskId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  // Invalidate cache
  invalidateProjectHealthCache(workspaceId, projectId);

  // Log significant status changes
  const significantChanges = [
    { from: "TODO", to: "IN_PROGRESS" },
    { from: "IN_PROGRESS", to: "DONE" },
    { from: "IN_PROGRESS", to: "BLOCKED" },
    { from: "BLOCKED", to: "IN_PROGRESS" },
  ];

  const isSignificant = significantChanges.some(
    (c) => c.from === oldStatus && c.to === newStatus
  );

  if (isSignificant) {
    logger.info("[ProjectHealthListener] Significant task status change", {
      workspaceId,
      projectId,
      taskId,
      oldStatus,
      newStatus,
    });
  }
}

/**
 * Handle milestone completion events.
 */
export async function handleMilestoneCompleted(
  workspaceId: string,
  projectId: string,
  milestoneId: string
): Promise<void> {
  // Invalidate cache
  invalidateProjectHealthCache(workspaceId, projectId);

  logger.info("[ProjectHealthListener] Milestone completed", {
    workspaceId,
    projectId,
    milestoneId,
  });
}

/**
 * Handle blocker events.
 */
export async function handleBlockerEvent(
  workspaceId: string,
  projectId: string,
  taskId: string,
  blockerType: "added" | "resolved"
): Promise<void> {
  // Invalidate cache
  invalidateProjectHealthCache(workspaceId, projectId);

  logger.info("[ProjectHealthListener] Blocker event", {
    workspaceId,
    projectId,
    taskId,
    blockerType,
  });
}

// =============================================================================
// Background Refresh
// =============================================================================

/**
 * Refresh health snapshot in background after cache invalidation.
 * This pre-populates the cache for better UX.
 */
export async function refreshProjectHealthInBackground(
  workspaceId: string,
  projectId: string
): Promise<void> {
  try {
    const snapshot = await buildProjectHealthSnapshot(workspaceId, projectId, {
      includeHistory: true,
      velocityWeeks: 4,
    });

    cacheProjectHealth(workspaceId, projectId, snapshot);

    logger.debug("[ProjectHealthListener] Background refresh completed", {
      workspaceId,
      projectId,
      overallHealth: snapshot.summary.overallHealth,
    });
  } catch (error) {
    logger.warn("[ProjectHealthListener] Background refresh failed", {
      workspaceId,
      projectId,
      error,
    });
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize project health listeners.
 * Call this during application startup.
 */
export function initializeProjectHealthListeners(): void {
  logger.info("[ProjectHealthListener] Listeners initialized");

  // Note: Actual event subscription would happen here
  // This depends on the event system being used (Socket.io, EventEmitter, etc.)
  // Example:
  // eventEmitter.on('task.status_changed', handleTaskStatusChange);
  // eventEmitter.on('milestone.completed', handleMilestoneCompleted);
}
