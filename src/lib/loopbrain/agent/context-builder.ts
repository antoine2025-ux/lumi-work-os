/**
 * Workspace Context Builder for the Agent Planner
 *
 * Preloads a compact snapshot of workspace state (projects, recent tasks,
 * members, goals, epics) so the planner can resolve entity references,
 * detect similar work, and avoid unnecessary clarifying questions.
 *
 * Queries run in parallel and results are formatted as a concise text
 * block that fits inside the planner's user prompt.
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlannerContextProject {
  id: string
  name: string
  status: string
  priority: string
  taskCount: number
  updatedAt: string
  stale: boolean
}

export interface PlannerContext {
  projects: PlannerContextProject[]
  recentTasks: { id: string; title: string; status: string; projectName: string; assigneeId: string | null; assigneeName: string | null }[]
  members: { userId: string; name: string; email: string; role: string }[]
  goals: { id: string; title: string; status: string }[]
  epics: { id: string; title: string; projectName: string }[]
}

// ---------------------------------------------------------------------------
// Schema hints — valid enum values the planner should know about
// ---------------------------------------------------------------------------

export const SCHEMA_HINTS = {
  projectStatus: ['ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
  projectPriority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  taskStatus: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
  taskPriority: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
  goalStatus: ['ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED', 'NOT_STARTED'],
} as const

// ---------------------------------------------------------------------------
// Builder — parallel DB queries
// ---------------------------------------------------------------------------

const MAX_PROJECTS = 25
const MAX_TASKS = 40
const MAX_MEMBERS = 30
const MAX_GOALS = 15
const MAX_EPICS = 15

/** Projects with updatedAt older than this are flagged as stale */
const STALE_THRESHOLD_DAYS = 14

export async function buildPlannerContext(
  workspaceId: string
): Promise<PlannerContext> {
  const start = Date.now()

  const [projects, tasks, members, goals, epics] = await Promise.all([
    prisma.project
      .findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          updatedAt: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_PROJECTS,
      })
      .catch(() => []),

    prisma.task
      .findMany({
        where: { project: { workspaceId } },
        select: {
          id: true,
          title: true,
          status: true,
          assigneeId: true,
          assignee: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_TASKS,
      })
      .catch(() => []),

    prisma.workspaceMember
      .findMany({
        where: { workspaceId },
        select: {
          userId: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
        take: MAX_MEMBERS,
      })
      .catch(() => []),

    prisma.goal
      .findMany({
        where: { workspaceId },
        select: { id: true, title: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_GOALS,
      })
      .catch(() => []),

    prisma.epic
      .findMany({
        where: { project: { workspaceId } },
        select: {
          id: true,
          title: true,
          project: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_EPICS,
      })
      .catch(() => []),
  ])

  logger.debug('Agent context-builder: loaded workspace context', {
    workspaceId,
    projects: projects.length,
    tasks: tasks.length,
    members: members.length,
    goals: goals.length,
    epics: epics.length,
    durationMs: Date.now() - start,
  })

  const now = Date.now()
  const staleCutoff = now - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

  return {
    projects: projects.map((p) => {
      const updatedMs = p.updatedAt.getTime()
      const status = String(p.status ?? 'ACTIVE')
      const isActive = status === 'ACTIVE' || status === 'PLANNING'
      return {
        id: p.id,
        name: p.name,
        status,
        priority: String(p.priority ?? 'MEDIUM'),
        taskCount: p._count.tasks,
        updatedAt: p.updatedAt.toISOString(),
        stale: isActive && updatedMs < staleCutoff,
      }
    }),
    recentTasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: String(t.status ?? 'TODO'),
      projectName: t.project.name,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.name ?? null,
    })),
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user?.name ?? 'Unknown',
      email: m.user?.email ?? '',
      role: String(m.role),
    })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      status: String(g.status ?? 'NOT_STARTED'),
    })),
    epics: epics.map((e) => ({
      id: e.id,
      title: e.title,
      projectName: e.project.name,
    })),
  }
}

// ---------------------------------------------------------------------------
// Formatter — compact text for the planner prompt
// ---------------------------------------------------------------------------

function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000))
}

export function formatContextForPrompt(ctx: PlannerContext): string {
  const sections: string[] = []

  // Schema hints
  sections.push(
    '### Valid enum values',
    `Project status: ${SCHEMA_HINTS.projectStatus.join(', ')}`,
    `Project priority: ${SCHEMA_HINTS.projectPriority.join(', ')}`,
    `Task status: ${SCHEMA_HINTS.taskStatus.join(', ')}`,
    `Task priority: ${SCHEMA_HINTS.taskPriority.join(', ')}`,
    `Goal status: ${SCHEMA_HINTS.goalStatus.join(', ')}`,
    ''
  )

  // Projects — enriched with task count and staleness
  if (ctx.projects.length > 0) {
    sections.push('### Projects')
    for (const p of ctx.projects) {
      const days = daysAgo(p.updatedAt)
      const staleTag = p.stale ? ' — STALE' : ''
      const updatedLabel = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`
      sections.push(
        `- "${p.name}" (id: ${p.id}) [${p.status}, ${p.priority}] — ${p.taskCount} tasks, updated ${updatedLabel}${staleTag}`
      )
    }
    sections.push('')
  }

  // Recent tasks
  if (ctx.recentTasks.length > 0) {
    sections.push('### Recent tasks')
    for (const t of ctx.recentTasks) {
      const assignee = t.assigneeName
        ? `, assignee: ${t.assigneeName} (${t.assigneeId})`
        : ', unassigned'
      sections.push(`- "${t.title}" (id: ${t.id}, status: ${t.status}, project: ${t.projectName}${assignee})`)
    }
    sections.push('')
  }

  // Members
  if (ctx.members.length > 0) {
    sections.push('### Workspace members')
    for (const m of ctx.members) {
      sections.push(`- ${m.name} (userId: ${m.userId}, email: ${m.email}, role: ${m.role})`)
    }
    sections.push('')
  }

  // Goals
  if (ctx.goals.length > 0) {
    sections.push('### Goals')
    for (const g of ctx.goals) {
      sections.push(`- "${g.title}" (id: ${g.id}, status: ${g.status})`)
    }
    sections.push('')
  }

  // Epics
  if (ctx.epics.length > 0) {
    sections.push('### Epics')
    for (const e of ctx.epics) {
      sections.push(`- "${e.title}" (id: ${e.id}, project: ${e.projectName})`)
    }
    sections.push('')
  }

  if (sections.length <= 7) {
    // Only schema hints, no data
    return sections.join('\n') + '\nNo workspace data found yet.'
  }

  return sections.join('\n')
}
