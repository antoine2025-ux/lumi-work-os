/**
 * User-scoped action item context builder for Loopbrain.
 *
 * Fetches both Tasks (project-scoped) and Todos (personal) assigned to a
 * specific user, normalises them into a unified ActionItem shape, and builds
 * a summary the LLM can reason over.
 *
 * Used by the orchestrator when a task-specific intent is detected
 * (TASK_STATUS, TASK_PRIORITY) to provide precise, user-scoped answers.
 */

import { prisma } from "@/lib/db";
import { taskToContext } from "@/lib/context/context-builders";
import type { ContextObject } from "@/lib/context/context-types";

// ---------------------------------------------------------------------------
// ActionItem — normalised shape shared by Tasks and Todos
// ---------------------------------------------------------------------------

export interface ActionItem {
  id: string;
  source: "task" | "todo";
  title: string;
  /** Normalised: 'open' | 'in_progress' | 'in_review' | 'blocked' | 'done' */
  status: string;
  priority: string | null;
  dueDate: Date | null;
  isOverdue: boolean;
  projectName: string | null;
  /** For todos: 'PROJECT' | 'TASK' | 'PAGE' | 'NONE' */
  anchorType: string | null;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UserTaskContextResult {
  /** Task ContextObjects (for structuredContext injection) */
  tasks: ContextObject[];
  /** Unified action items (tasks + todos) for prompt rendering */
  actionItems: ActionItem[];
  /** Human-readable summary covering both tasks and todos */
  summary: string;
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function normaliseTaskStatus(status: string): string {
  switch (status) {
    case "TODO":
      return "open";
    case "IN_PROGRESS":
      return "in_progress";
    case "IN_REVIEW":
      return "in_review";
    case "BLOCKED":
      return "blocked";
    case "DONE":
      return "done";
    default:
      return status.toLowerCase();
  }
}

function normalisePriority(p: string | null | undefined): string | null {
  if (!p) return null;
  return p.toLowerCase();
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Fetch all action items (Tasks + Todos) assigned to the current user.
 * Returns ContextObjects for tasks, a unified ActionItem list, and a summary.
 */
export async function getUserTaskContext(params: {
  workspaceId: string;
  userId: string;
  limit?: number;
}): Promise<UserTaskContextResult> {
  const { workspaceId, userId, limit = 30 } = params;

  if (!workspaceId || !userId) {
    return {
      tasks: [],
      actionItems: [],
      summary: "No action item data available.",
    };
  }

  const now = new Date();

  // -----------------------------------------------------------------------
  // 1. Fetch Tasks (project-scoped)
  // -----------------------------------------------------------------------
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: userId,
      status: { not: "DONE" },
    },
    include: {
      project: true,
      assignee: true,
    },
    orderBy: [
      { dueDate: { sort: "asc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    take: limit,
  });

  const taskContextObjects = tasks.map((task) => taskToContext(task));

  const taskActionItems: ActionItem[] = tasks.map((t) => ({
    id: t.id,
    source: "task" as const,
    title: t.title,
    status: normaliseTaskStatus(t.status),
    priority: normalisePriority(t.priority),
    dueDate: t.dueDate,
    isOverdue: !!(t.dueDate && t.dueDate < now),
    projectName: t.project?.name ?? null,
    anchorType: null,
  }));

  // -----------------------------------------------------------------------
  // 2. Fetch Todos (personal)
  // -----------------------------------------------------------------------
  const todos = await prisma.todo.findMany({
    where: {
      workspaceId,
      assignedToId: userId,
      status: "OPEN",
    },
    orderBy: [
      { dueAt: { sort: "asc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    take: 20,
  });

  const todoActionItems: ActionItem[] = todos.map((td) => ({
    id: td.id,
    source: "todo" as const,
    title: td.title,
    status: "open",
    priority: normalisePriority(td.priority),
    dueDate: td.dueAt,
    isOverdue: !!(td.dueAt && td.dueAt < now),
    projectName: null,
    anchorType: td.anchorType,
  }));

  // -----------------------------------------------------------------------
  // 3. Merge and sort (overdue first, then by due date)
  // -----------------------------------------------------------------------
  const actionItems = [...taskActionItems, ...todoActionItems].sort((a, b) => {
    // Overdue items first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    // Then by due date (nulls last)
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  // -----------------------------------------------------------------------
  // 4. Build unified summary
  // -----------------------------------------------------------------------
  const taskOverdue = taskActionItems.filter((i) => i.isOverdue).length;
  const taskBlocked = taskActionItems.filter((i) => i.status === "blocked").length;
  const taskInProgress = taskActionItems.filter((i) => i.status === "in_progress").length;
  const todoOverdue = todoActionItems.filter((i) => i.isOverdue).length;
  const totalOverdue = taskOverdue + todoOverdue;

  let summary: string;

  if (taskActionItems.length === 0 && todoActionItems.length === 0) {
    summary = "You have 0 action items. No tasks or to-dos are assigned to you.";
  } else if (taskActionItems.length > 0 && todoActionItems.length > 0) {
    // Both present — use "action items" as umbrella
    const total = actionItems.length;
    const taskParts: string[] = [];
    if (taskOverdue > 0) taskParts.push(`${taskOverdue} overdue`);
    if (taskBlocked > 0) taskParts.push(`${taskBlocked} blocked`);
    if (taskInProgress > 0) taskParts.push(`${taskInProgress} in progress`);
    const taskDetail =
      taskParts.length > 0
        ? `${taskActionItems.length} task(s) (${taskParts.join(", ")})`
        : `${taskActionItems.length} task(s)`;

    const todoParts: string[] = [];
    if (todoOverdue > 0) todoParts.push(`${todoOverdue} overdue`);
    const todoDetail =
      todoParts.length > 0
        ? `${todoActionItems.length} to-do(s) (${todoParts.join(", ")})`
        : `${todoActionItems.length} to-do(s)`;

    summary = `You have ${total} action items: ${taskDetail} and ${todoDetail}.`;
    if (totalOverdue > 0) {
      summary += ` ${totalOverdue} total overdue.`;
    }
  } else if (taskActionItems.length > 0) {
    // Only tasks
    const parts: string[] = [];
    if (taskOverdue > 0) parts.push(`${taskOverdue} overdue`);
    if (taskBlocked > 0) parts.push(`${taskBlocked} blocked`);
    if (taskInProgress > 0) parts.push(`${taskInProgress} in progress`);
    summary =
      parts.length > 0
        ? `You have ${taskActionItems.length} active task(s) (${parts.join(", ")}). No personal to-dos.`
        : `You have ${taskActionItems.length} active task(s). No personal to-dos.`;
  } else {
    // Only todos
    const parts: string[] = [];
    if (todoOverdue > 0) parts.push(`${todoOverdue} overdue`);
    summary =
      parts.length > 0
        ? `You have ${todoActionItems.length} to-do(s) (${parts.join(", ")}). No project tasks assigned.`
        : `You have ${todoActionItems.length} to-do(s). No project tasks assigned.`;
  }

  return { tasks: taskContextObjects, actionItems, summary };
}
