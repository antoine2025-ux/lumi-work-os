/**
 * Derive open loops for a user from canonical data sources.
 *
 * Sources:
 *   1. Overdue tasks (assigned to user, past due, not DONE)
 *   2. Blocked tasks (assigned to user, status BLOCKED)
 *   3. Work recommendations awaiting acknowledgment (workspace-scoped,
 *      linked to work requests created by the user)
 *   4. Overdue todos (assigned to user, past due, status OPEN)
 *
 * Idempotent: uses upsert on the unique (workspaceId, userId, entityType, entityId) key.
 * Bounded: each query is capped with `take` limits.
 * Auto-resolves: any OPEN loop whose entity no longer appears in the derived set is RESOLVED.
 */

import { prisma } from "@/lib/db";

interface DerivedLoop {
  entityType: string;
  entityId: string;
  type: "BLOCKED" | "WAITING" | "OVERDUE" | "NEEDS_RESPONSE";
  title: string;
  detail: string | null;
}

/**
 * Derive and persist open loops for a single user in a workspace.
 * Safe to call on every chat turn -- bounded and idempotent.
 */
export async function deriveOpenLoops(
  workspaceId: string,
  userId: string,
): Promise<void> {
  if (!workspaceId || !userId) return;

  const now = new Date();
  const derived: DerivedLoop[] = [];

  // -----------------------------------------------------------------------
  // 1. OVERDUE tasks: assigned to user, dueDate < now, status != DONE
  // -----------------------------------------------------------------------
  const overdueTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: userId,
      dueDate: { lt: now },
      status: { not: "DONE" },
    },
    select: { id: true, title: true, dueDate: true },
    take: 20,
    orderBy: { dueDate: "asc" },
  });

  for (const t of overdueTasks) {
    const daysAgo = t.dueDate
      ? Math.floor((now.getTime() - t.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    derived.push({
      entityType: "task",
      entityId: t.id,
      type: "OVERDUE",
      title: t.title,
      detail: daysAgo > 0 ? `due ${daysAgo} day(s) ago` : "due today",
    });
  }

  // -----------------------------------------------------------------------
  // 2. BLOCKED tasks: assigned to user, status = BLOCKED
  // -----------------------------------------------------------------------
  const blockedTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: userId,
      status: "BLOCKED",
    },
    select: { id: true, title: true },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });

  for (const t of blockedTasks) {
    // Skip if already captured as OVERDUE (a task can be both blocked and overdue)
    if (derived.some((d) => d.entityId === t.id)) continue;
    derived.push({
      entityType: "task",
      entityId: t.id,
      type: "BLOCKED",
      title: t.title,
      detail: "blocked",
    });
  }

  // -----------------------------------------------------------------------
  // 3. NEEDS_RESPONSE: unacknowledged work recommendations for work requests
  //    created by this user that are still OPEN
  // -----------------------------------------------------------------------
  const unackedRecs = await prisma.workRecommendationLog.findMany({
    where: {
      workspaceId,
      acknowledgedAt: null,
      workRequest: {
        createdById: userId,
        status: "OPEN",
      },
    },
    select: {
      id: true,
      workRequest: { select: { id: true, title: true } },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  for (const rec of unackedRecs) {
    derived.push({
      entityType: "work_recommendation",
      entityId: rec.id,
      type: "NEEDS_RESPONSE",
      title: rec.workRequest.title,
      detail: "awaiting acknowledgment",
    });
  }

  // -----------------------------------------------------------------------
  // 4. OVERDUE todos: assigned to user, dueAt < now, status = OPEN
  // -----------------------------------------------------------------------
  const overdueTodos = await prisma.todo.findMany({
    where: {
      workspaceId,
      assignedToId: userId,
      dueAt: { lt: now },
      status: "OPEN",
    },
    select: { id: true, title: true, dueAt: true },
    take: 20,
    orderBy: { dueAt: "asc" },
  });

  for (const td of overdueTodos) {
    const daysAgo = td.dueAt
      ? Math.floor(
          (now.getTime() - td.dueAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;
    derived.push({
      entityType: "todo",
      entityId: td.id,
      type: "OVERDUE",
      title: td.title,
      detail: daysAgo > 0 ? `due ${daysAgo} day(s) ago` : "due today",
    });
  }

  // -----------------------------------------------------------------------
  // Upsert derived loops
  // -----------------------------------------------------------------------
  const derivedEntityKeys = new Set(
    derived.map((d) => `${d.entityType}::${d.entityId}`),
  );

  for (const loop of derived) {
    await prisma.loopbrainOpenLoop.upsert({
      where: {
        workspaceId_userId_entityType_entityId: {
          workspaceId,
          userId,
          entityType: loop.entityType,
          entityId: loop.entityId,
        },
      },
      create: {
        workspaceId,
        userId,
        type: loop.type,
        status: "OPEN",
        title: loop.title,
        detail: loop.detail,
        entityType: loop.entityType,
        entityId: loop.entityId,
      },
      update: {
        type: loop.type,
        title: loop.title,
        detail: loop.detail,
        status: "OPEN",
        // updatedAt is auto-touched by @updatedAt
      },
    });
  }

  // -----------------------------------------------------------------------
  // Auto-resolve stale loops: OPEN loops whose entity is no longer derived
  // -----------------------------------------------------------------------
  const existingOpen = await prisma.loopbrainOpenLoop.findMany({
    where: { workspaceId, userId, status: "OPEN" },
    select: { id: true, entityType: true, entityId: true },
  });

  const staleIds = existingOpen
    .filter((e) => !derivedEntityKeys.has(`${e.entityType}::${e.entityId}`))
    .map((e) => e.id);

  if (staleIds.length > 0) {
    await prisma.loopbrainOpenLoop.updateMany({
      where: { id: { in: staleIds } },
      data: { status: "RESOLVED" },
    });
  }
}
