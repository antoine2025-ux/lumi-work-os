/**
 * Loopbrain Agent Tool Registry
 *
 * Central registry of tools the Loopbrain planner/executor can invoke.
 * Each tool validates input with Zod, calls Prisma directly (NOT HTTP),
 * and returns a structured ToolResult.
 *
 * Write tools set requiresConfirmation = true so the planner always
 * presents a confirmation step to the user before execution.
 */

import { z } from 'zod'
import { prisma, prismaUnscoped } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { sendGmail } from '@/lib/integrations/gmail-send'
import { createCalendarEvent } from '@/lib/integrations/calendar-events'
import { logger } from '@/lib/logger'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import type { LoopbrainTool, AgentContext, ToolResult } from './types'
import { getDefaultSpaceForUser } from '@/lib/spaces/get-default-space'
import { executeAction } from '@/lib/loopbrain/actions/executor'
import { searchDriveFilesTool } from './tools/drive/search-drive-files'
import { readDriveDocumentTool } from './tools/drive/read-drive-document'
import { createDriveDocumentTool } from './tools/drive/create-drive-document'
import { updateDriveDocumentTool } from './tools/drive/update-drive-document'
import { extractTextFromProseMirror, isValidProseMirrorJSON } from '@/lib/wiki/text-extract'
import { streamDraftToPage } from '@/lib/loopbrain/services/draft-page'
import { isGmailConnected } from '@/lib/loopbrain/context-sources/gmail'
import { searchGmailForContext } from '@/lib/loopbrain/context-sources/gmail-search'
import { loadCalendarEvents } from '@/lib/loopbrain/context-sources/calendar'
import { isSlackAvailable } from '@/lib/loopbrain/slack-helper'
import { searchSlackMessages } from '@/lib/loopbrain/context-sources/slack-search'
import { searchSimilarContextItems } from '@/lib/loopbrain/embedding-service'
import { ContextType } from '@/lib/loopbrain/context-types'
import { PrismaContextEngine } from '@/lib/loopbrain/context-engine'
import { buildWorkloadAnalysis } from '@/lib/loopbrain/workload-analysis'
import { getAccessibleProjectIds, assertProjectMembership } from '@/lib/loopbrain/permissions/resource-acl'
import { getAccessiblePersonIds } from '@/lib/loopbrain/permissions/hierarchy'
import { hasToolRole } from '@/lib/loopbrain/permissions'
import { filterPersonData } from '@/lib/loopbrain/permissions/context-filter'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function scope(ctx: AgentContext): void {
  setWorkspaceContext(ctx.workspaceId)
}

// ---------------------------------------------------------------------------
// Enum normalization helpers
// ---------------------------------------------------------------------------

/** Common LLM mistakes: maps wrong status values to valid task statuses */
const TASK_STATUS_ALIASES: Record<string, string> = {
  ACTIVE: 'TODO',
  PLANNING: 'TODO',
  URGENT: 'TODO',
  PENDING: 'TODO',
  NEW: 'TODO',
  OPEN: 'TODO',
  COMPLETE: 'DONE',
  COMPLETED: 'DONE',
  CLOSED: 'DONE',
  FINISHED: 'DONE',
}

function coerceNumber(val: unknown): unknown {
  if (typeof val === 'string') {
    const n = Number(val)
    return Number.isFinite(n) ? n : val
  }
  return val
}

function normalizeEnum(val: unknown): unknown {
  return typeof val === 'string' ? val.toUpperCase().replace(/ /g, '_') : val
}

function normalizeTaskStatus(val: unknown): unknown {
  if (typeof val !== 'string') return val
  const upper = val.toUpperCase().replace(/ /g, '_')
  return TASK_STATUS_ALIASES[upper] ?? upper
}

// ---------------------------------------------------------------------------
// Schemas (standalone so z.infer works)
// ---------------------------------------------------------------------------

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.preprocess(normalizeEnum,
    z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
  ).optional().default('ACTIVE'),
  priority: z.preprocess(normalizeEnum,
    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  ).optional().default('MEDIUM'),
})

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  projectId: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  epicId: z.string().optional(),
  priority: z.preprocess(normalizeEnum,
    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  ).optional().default('MEDIUM'),
  status: z.preprocess(normalizeTaskStatus,
    z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'])
  ).optional().default('TODO'),
})

const CreateEpicSchema = z.object({
  title: z.string().min(1).max(300),
  projectId: z.string().min(1),
  description: z.string().optional(),
})

const AssignTaskSchema = z.object({
  taskId: z.string().min(1),
  assigneeId: z.string().min(1),
})

const CreateTodoSchema = z.object({
  title: z.string().min(1).max(500),
  note: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.preprocess(
    normalizeEnum,
    z.enum(['LOW', 'MEDIUM', 'HIGH'])
  ).optional(),
})

const ReadWikiPageSchema = z.object({
  pageId: z.string().optional().describe('Wiki page ID (use this OR slug, not both)'),
  slug: z.string().optional().describe('Wiki page slug (use this OR pageId, not both)'),
}).refine((d) => d.pageId || d.slug, { message: 'Provide either pageId or slug' })

const CreateWikiPageSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
})

const CreateGoalSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  level: z.preprocess(
    normalizeEnum,
    z.enum(['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'])
  ).optional().default('TEAM'),
  period: z.preprocess(
    normalizeEnum,
    z.enum(['QUARTERLY', 'ANNUAL', 'CUSTOM'])
  ).optional().default('QUARTERLY'),
})

const AddPersonToProjectSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.preprocess(
    normalizeEnum,
    z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
  ).optional().default('MEMBER'),
})

const AssignToProjectSchema = z.object({
  personId: z.string().min(1),
  projectId: z.string().min(1),
  role: z.preprocess(
    normalizeEnum,
    z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
  ).optional().default('MEMBER'),
})

const CreateTimeOffSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
  type: z.string().optional().default('vacation'),
})
const AssignManagerSchema = z.object({
  personId: z.string().min(1),
  managerId: z.string().min(1),
})
const CreatePersonSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  title: z.string().optional(),
  teamId: z.string().optional(),
  departmentId: z.string().optional(),
})

const UpdateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.preprocess(
    normalizeTaskStatus,
    z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'])
  ),
})

const ListTasksByAssigneeSchema = z.object({
  personId: z.string().describe('The person/user ID whose tasks to list'),
  projectId: z.string().optional().describe('Optional project ID to scope the query'),
  status: z.preprocess(
    normalizeEnum,
    z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
  ).optional().describe('Optional status filter'),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).optional().default(50)),
})

const BulkReassignTasksSchema = z.object({
  taskIds: z.array(z.string()).min(1).optional().describe('Array of task IDs to reassign'),
  tasks: z.array(z.object({ id: z.string() }).passthrough()).min(1).optional().describe('Array of task objects — use when passing $stepN.data.tasks directly; IDs are extracted automatically'),
  newAssigneeId: z.string().describe('The person/user ID to reassign tasks to'),
})

const UpdateProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.preprocess(normalizeEnum,
    z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
  ).optional(),
  priority: z.preprocess(normalizeEnum,
    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  ).optional(),
})

const LinkProjectToGoalSchema = z.object({
  projectId: z.string().min(1),
  goalId: z.string().min(1),
  contributionType: z.preprocess(normalizeEnum,
    z.enum(['REQUIRED', 'CONTRIBUTING', 'SUPPORTING'])
  ).optional().default('CONTRIBUTING'),
})

const AddSubtaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
})

const RemoveProjectMemberSchema = z.object({
  projectId: z.string().describe('The project ID to remove the member from'),
  personId: z.string().describe('The person/user ID to remove from the project'),
})

const SearchEmailSchema = z.object({ query: z.string().min(1) })
const GetCalendarEventsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
const SearchSlackMessagesSchema = z.object({ query: z.string().min(1) })
const GetPersonProfileSchema = z.object({ personId: z.string().min(1) })
const SearchWikiSchema = z.object({
  query: z.string().min(1),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(10).optional().default(5)),
})
const QueryOrgSchema = z.object({ question: z.string().optional() })
const GetCapacitySchema = z.object({
  personId: z.string().optional(),
  teamId: z.string().optional(),
})
const GetProjectHealthSchema = z.object({ projectId: z.string().min(1) })

const ListProjectsSchema = z.object({
  status: z
    .preprocess(
      normalizeEnum,
      z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ALL'])
    )
    .optional(),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(50).optional().default(20)),
})

const ListPeopleSchema = z.object({
  search: z.string().optional(),
  teamId: z.string().optional(),
  departmentId: z.string().optional(),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).optional().default(50)),
})

const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

const ReplyToEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  replyToThreadId: z.string().min(1),
  replyToMessageId: z.string().min(1),
})

const CreateCalendarEventSchema = z.object({
  summary: z.string().optional(),
  title: z.string().optional(),
  startDateTime: z.string().optional(),
  startTime: z.string().optional(),
  endDateTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
}).refine((d) => (d.summary ?? d.title) && (d.startDateTime ?? d.startTime) && (d.endDateTime ?? d.endTime), {
  message: 'createCalendarEvent requires title (or summary), startTime (or startDateTime), and endTime (or endDateTime)',
}).transform((d) => ({
  summary: d.summary ?? d.title ?? '',
  startDateTime: d.startDateTime ?? d.startTime ?? '',
  endDateTime: d.endDateTime ?? d.endTime ?? '',
  description: d.description,
  attendees: d.attendees,
  location: d.location,
  timeZone: d.timeZone,
}))

const CreateMultipleCalendarEventsSchema = z.object({
  events: z.array(CreateCalendarEventSchema).min(1).max(20),
})

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const createProjectTool: LoopbrainTool = {
  name: 'createProject',
  description: 'Create a new project in the workspace',
  category: 'project',
  parameters: CreateProjectSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER', resourceChecks: ['spaceMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateProjectSchema.parse(params)
    scope(context)
    try {
      // Get default space for the user
      const defaultSpaceId = await getDefaultSpaceForUser(context.userId, context.workspaceId)
      if (!defaultSpaceId) {
        return {
          success: false,
          error: 'No default space found. Please create a space first.',
          humanReadable: 'Failed to create project: no default space found',
        }
      }

      const project = await prisma.project.create({
        data: {
          workspaceId: context.workspaceId,
          name: p.name,
          description: p.description ?? null,
          status: p.status,
          priority: p.priority,
          createdById: context.userId,
          spaceId: defaultSpaceId,
        },
      })
      return {
        success: true,
        data: { id: project.id, name: project.name },
        humanReadable: `Created project "${project.name}" (${project.id})`,
      }
    } catch (err: unknown) {
      logger.error('createProject tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create project' }
    }
  },
}

const createTaskTool: LoopbrainTool = {
  name: 'createTask',
  description: 'Create a task inside an existing project',
  category: 'task',
  parameters: CreateTaskSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateTaskSchema.parse(params)
    scope(context)
    try {
      const task = await prisma.task.create({
        data: {
          workspaceId: context.workspaceId,
          projectId: p.projectId,
          title: p.title,
          description: p.description ?? null,
          assigneeId: p.assigneeId ?? null,
          epicId: p.epicId ?? null,
          priority: p.priority,
          status: p.status,
          createdById: context.userId,
        },
      })
      return {
        success: true,
        data: { id: task.id, title: task.title, projectId: task.projectId },
        humanReadable: `Created task "${task.title}" (${task.id})`,
      }
    } catch (err: unknown) {
      logger.error('createTask tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create task' }
    }
  },
}

const createEpicTool: LoopbrainTool = {
  name: 'createEpic',
  description: 'Create an epic (a group of related tasks) within a project. Epics organize multiple related tasks under a common theme or goal.',
  category: 'project',
  parameters: CreateEpicSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateEpicSchema.parse(params)
    scope(context)
    try {
      const epic = await prisma.epic.create({
        data: {
          workspaceId: context.workspaceId,
          projectId: p.projectId,
          title: p.title,
          description: p.description ?? null,
        },
      })
      return {
        success: true,
        data: { id: epic.id, title: epic.title, projectId: epic.projectId },
        humanReadable: `Created epic "${epic.title}" (${epic.id})`,
      }
    } catch (err: unknown) {
      logger.error('createEpic tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create epic' }
    }
  },
}

const assignTaskTool: LoopbrainTool = {
  name: 'assignTask',
  description: 'Assign an existing task to a workspace member',
  category: 'task',
  parameters: AssignTaskSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = AssignTaskSchema.parse(params)
    scope(context)
    try {
      const task = await prisma.task.update({
        where: { id: p.taskId },
        data: { assigneeId: p.assigneeId },
        include: { assignee: { select: { name: true } } },
      })
      const name = task.assignee?.name ?? p.assigneeId
      return {
        success: true,
        data: { taskId: task.id, assigneeId: p.assigneeId },
        humanReadable: `Assigned task "${task.title}" to ${name}`,
      }
    } catch (err: unknown) {
      logger.error('assignTask tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to assign task' }
    }
  },
}

const createTodoTool: LoopbrainTool = {
  name: 'createTodo',
  description: 'Create a personal to-do item for the current user',
  category: 'todo',
  parameters: CreateTodoSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateTodoSchema.parse(params)
    scope(context)
    try {
      const todo = await prisma.todo.create({
        data: {
          workspaceId: context.workspaceId,
          title: p.title,
          note: p.note ?? null,
          dueAt: p.dueAt ? new Date(p.dueAt) : null,
          priority: p.priority ?? null,
          createdById: context.userId,
          assignedToId: context.userId,
        },
      })
      return {
        success: true,
        data: { id: todo.id, title: todo.title },
        humanReadable: `Created to-do "${todo.title}"`,
      }
    } catch (err: unknown) {
      logger.error('createTodo tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create to-do' }
    }
  },
}

const readWikiPageTool: LoopbrainTool = {
  name: 'readWikiPage',
  description: 'Read the full content of a wiki page by ID or slug. Returns title, plaintext content, tags, author, and last-updated date. Use after searchWiki when you need the actual page content.',
  category: 'wiki',
  parameters: ReadWikiPageSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = ReadWikiPageSchema.parse(params)
    scope(context)
    try {
      let page: {
        id: string
        title: string
        slug: string
        content: string
        contentJson: unknown
        textContent: string | null
        tags: string[]
        updatedAt: Date
        createdBy: { name: string | null; email: string | null }
      } | null = null

      const select = {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentJson: true,
        textContent: true,
        tags: true,
        updatedAt: true,
        createdBy: { select: { name: true, email: true } },
      }

      if (p.pageId) {
        page = await prisma.wikiPage.findUnique({
          where: { id: p.pageId },
          select,
        })
      } else if (p.slug) {
        page = await prisma.wikiPage.findUnique({
          where: { workspaceId_slug: { workspaceId: context.workspaceId, slug: p.slug } },
          select,
        })
      }

      if (!page) {
        return { success: false, error: 'Wiki page not found', humanReadable: 'No wiki page found with that ID or slug.' }
      }

      // Resolve plaintext: prefer pre-extracted textContent, then TipTap JSON extraction, then raw content
      let plaintext: string
      if (page.textContent) {
        plaintext = page.textContent
      } else if (page.contentJson && isValidProseMirrorJSON(page.contentJson)) {
        plaintext = extractTextFromProseMirror(page.contentJson)
      } else {
        plaintext = page.content
      }

      // Truncate to a safe token budget (~5000 chars ≈ ~1250 tokens)
      const CONTENT_LIMIT = 5000
      const truncated = plaintext.length > CONTENT_LIMIT
      const content = truncated ? plaintext.slice(0, CONTENT_LIMIT) + '\n\n[content truncated — page has more text]' : plaintext

      return {
        success: true,
        data: {
          id: page.id,
          slug: page.slug,
          title: page.title,
          content,
          tags: page.tags,
          createdBy: page.createdBy.name ?? page.createdBy.email ?? 'Unknown',
          updatedAt: page.updatedAt.toISOString(),
          truncated,
        },
        humanReadable: `Read wiki page "${page.title}" (${page.slug})${truncated ? ' — content truncated at 5000 chars' : ''}`,
      }
    } catch (err: unknown) {
      logger.error('readWikiPage tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to read wiki page' }
    }
  },
}

const createWikiPageTool: LoopbrainTool = {
  name: 'createWikiPage',
  description: 'Create a new wiki page in the workspace',
  category: 'wiki',
  parameters: CreateWikiPageSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateWikiPageSchema.parse(params)
    scope(context)
    try {
      const slug = slugify(p.title) + '-' + Date.now().toString(36)
      const page = await prisma.wikiPage.create({
        data: {
          workspaceId: context.workspaceId,
          title: p.title,
          slug,
          content: p.content,
          createdById: context.userId,
        },
      })
      return {
        success: true,
        data: { id: page.id, slug: page.slug, title: page.title },
        humanReadable: `Created wiki page "${page.title}" (/wiki/${page.slug})`,
      }
    } catch (err: unknown) {
      logger.error('createWikiPage tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create wiki page' }
    }
  },
}

const DraftWikiPageSchema = z.object({
  title: z.string().min(1).max(300),
  topic: z.string().min(1),
  outline: z.array(z.string()).optional(),
  spaceId: z.string().optional(),
})

const draftWikiPageTool: LoopbrainTool = {
  name: 'draftWikiPage',
  description: 'Create a blank wiki page and trigger AI drafting into it via Hocuspocus',
  category: 'wiki',
  parameters: DraftWikiPageSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = DraftWikiPageSchema.parse(params)
    scope(context)
    try {
      // Resolve a space for the page (prefer explicit, then company wiki, then null)
      let spaceId: string | null = p.spaceId ?? null
      if (!spaceId) {
        const companyWiki = await prisma.space.findFirst({
          where: { workspaceId: context.workspaceId, type: 'WIKI' },
          select: { id: true },
        })
        spaceId = companyWiki?.id ?? null
      }

      // Create a blank page (no content — content will stream via Hocuspocus)
      const slug = slugify(p.title) + '-' + Date.now().toString(36)
      const page = await prisma.wikiPage.create({
        data: {
          workspaceId: context.workspaceId,
          title: p.title,
          slug,
          content: '',
          contentFormat: 'JSON',
          contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
          createdById: context.userId,
          ...(spaceId ? { spaceId } : {}),
        },
      })

      // Fire-and-forget: stream LLM content into the page via Hocuspocus
      void streamDraftToPage({
        pageId: page.id,
        workspaceId: context.workspaceId,
        topic: p.topic,
        outline: p.outline,
        userId: context.userId,
      })

      return {
        success: true,
        data: {
          id: page.id,
          slug: page.slug,
          title: page.title,
          clientAction: {
            type: 'navigate',
            url: `/wiki/${page.slug}`,
            label: `Opening ${page.title}…`,
          },
        },
        humanReadable: `Created wiki page "${page.title}" — AI is now drafting content about: ${p.topic}`,
      }
    } catch (err: unknown) {
      logger.error('draftWikiPage tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create draft wiki page' }
    }
  },
}

const createGoalTool: LoopbrainTool = {
  name: 'createGoal',
  description: 'Create a new goal/OKR for the workspace',
  category: 'goal',
  parameters: CreateGoalSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateGoalSchema.parse(params)
    scope(context)
    try {
      const now = new Date()
      const quarterEnd = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 0)
      const goal = await prisma.goal.create({
        data: {
          workspaceId: context.workspaceId,
          title: p.title,
          description: p.description ?? null,
          ownerId: p.ownerId ?? context.userId,
          level: p.level,
          period: p.period,
          startDate: now,
          endDate: quarterEnd,
          status: 'ACTIVE',
          createdById: context.userId,
        },
      })
      return {
        success: true,
        data: { id: goal.id, title: goal.title },
        humanReadable: `Created goal "${goal.title}" (${goal.id})`,
      }
    } catch (err: unknown) {
      logger.error('createGoal tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create goal' }
    }
  },
}

const addPersonToProjectTool: LoopbrainTool = {
  name: 'addPersonToProject',
  description: 'Add a user as a member of a project',
  category: 'project',
  parameters: AddPersonToProjectSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'ADMIN', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = AddPersonToProjectSchema.parse(params)
    scope(context)
    try {
      const member = await prisma.projectMember.create({
        data: {
          projectId: p.projectId,
          workspaceId: context.workspaceId,
          userId: p.userId,
          role: p.role,
        },
      })
      const user = await prisma.user.findUnique({
        where: { id: p.userId },
        select: { name: true },
      })
      return {
        success: true,
        data: { projectId: p.projectId, userId: p.userId, membershipId: member.id },
        humanReadable: `Added ${user?.name ?? p.userId} to project as ${p.role}`,
      }
    } catch (err: unknown) {
      logger.error('addPersonToProject tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to add person to project' }
    }
  },
}

const assignToProjectTool: LoopbrainTool = {
  name: 'assignToProject',
  description: 'Add a person to a project as a member. Maps personId to userId.',
  category: 'project',
  parameters: AssignToProjectSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'ADMIN', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = AssignToProjectSchema.parse(params)
    return addPersonToProjectTool.execute(
      { userId: p.personId, projectId: p.projectId, role: p.role },
      context
    )
  },
}

const createTimeOffTool: LoopbrainTool = {
  name: 'createTimeOff',
  description: 'Create a time-off / leave request for the current user.',
  category: 'org',
  parameters: CreateTimeOffSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateTimeOffSchema.parse(params)
    try {
      const result = await executeAction({
        action: {
          type: 'timeoff.create',
          userId: context.userId,
          startDate: (p.startDate ?? '').slice(0, 10),
          endDate: (p.endDate ?? '').slice(0, 10),
          timeOffType: (p.type ?? 'vacation').toLowerCase(),
          notes: p.reason,
        },
        workspaceId: context.workspaceId,
        userId: context.userId,
      })
      return result.ok
        ? { success: true, data: { id: result.result?.entityId, message: result.result?.message }, humanReadable: 'Time off created' }
        : { success: false, error: result.error?.message ?? 'Failed', humanReadable: result.error?.message ?? 'Failed to create time off' }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to create time off' }
    }
  },
}

const assignManagerTool: LoopbrainTool = {
  name: 'assignManager',
  description: 'Assign a manager to a person.',
  category: 'org',
  parameters: AssignManagerSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'ADMIN' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = AssignManagerSchema.parse(params)
    try {
      const result = await executeAction({
        action: {
          type: 'org.assign_manager',
          reportId: p.personId ?? '',
          managerId: p.managerId ?? '',
        },
        workspaceId: context.workspaceId,
        userId: context.userId,
      })
      return result.ok
        ? { success: true, data: { personId: p.personId, managerId: p.managerId, message: result.result?.message }, humanReadable: 'Manager assigned' }
        : { success: false, error: result.error?.message ?? 'Failed', humanReadable: result.error?.message ?? 'Failed to assign manager' }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to assign manager' }
    }
  },
}

const createPersonTool: LoopbrainTool = {
  name: 'createPerson',
  description: 'Create a new person record in the organization.',
  category: 'org',
  parameters: CreatePersonSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'ADMIN' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreatePersonSchema.parse(params)
    try {
      const result = await executeAction({
        action: {
          type: 'org.create_person',
          fullName: p.name ?? '',
          email: p.email,
          title: p.title,
          teamId: p.teamId,
        },
        workspaceId: context.workspaceId,
        userId: context.userId,
      })
      return result.ok
        ? { success: true, data: { id: result.result?.entityId, name: p.name, message: result.result?.message }, humanReadable: 'Person created' }
        : { success: false, error: result.error?.message ?? 'Failed', humanReadable: result.error?.message ?? 'Failed to create person' }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to create person' }
    }
  },
}

const updateTaskStatusTool: LoopbrainTool = {
  name: 'updateTaskStatus',
  description: 'Change the status of an existing task',
  category: 'task',
  parameters: UpdateTaskStatusSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = UpdateTaskStatusSchema.parse(params)
    scope(context)
    try {
      const task = await prisma.task.update({
        where: { id: p.taskId },
        data: {
          status: p.status,
          completedAt: p.status === 'DONE' ? new Date() : null,
        },
      })
      return {
        success: true,
        data: { taskId: task.id, status: task.status },
        humanReadable: `Updated task "${task.title}" status to ${p.status}`,
      }
    } catch (err: unknown) {
      logger.error('updateTaskStatus tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to update task status' }
    }
  },
}

const updateProjectTool: LoopbrainTool = {
  name: 'updateProject',
  description: 'Update an existing project\'s name, description, status, or priority',
  category: 'project',
  parameters: UpdateProjectSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = UpdateProjectSchema.parse(params)
    scope(context)
    try {
      const data: Record<string, unknown> = {}
      if (p.name !== undefined) data.name = p.name
      if (p.description !== undefined) data.description = p.description
      if (p.status !== undefined) data.status = p.status
      if (p.priority !== undefined) data.priority = p.priority
      const project = await prisma.project.update({
        where: { id: p.projectId },
        data,
      })
      return {
        success: true,
        data: { id: project.id, name: project.name },
        humanReadable: `Updated project "${project.name}" (${project.id})`,
      }
    } catch (err: unknown) {
      logger.error('updateProject tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to update project' }
    }
  },
}

const linkProjectToGoalTool: LoopbrainTool = {
  name: 'linkProjectToGoal',
  description: 'Link a project to a goal, establishing that the project contributes to achieving the goal',
  category: 'project',
  parameters: LinkProjectToGoalSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = LinkProjectToGoalSchema.parse(params)
    scope(context)
    try {
      const link = await prisma.projectGoalLink.create({
        data: {
          projectId: p.projectId,
          goalId: p.goalId,
          workspaceId: context.workspaceId,
          contributionType: p.contributionType,
        },
        include: {
          project: { select: { name: true } },
          goal: { select: { title: true } },
        },
      })
      return {
        success: true,
        data: { id: link.id, projectId: p.projectId, goalId: p.goalId },
        humanReadable: `Linked project "${link.project.name}" to goal "${link.goal.title}"`,
      }
    } catch (err: unknown) {
      logger.error('linkProjectToGoal tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to link project to goal' }
    }
  },
}

const addSubtaskTool: LoopbrainTool = {
  name: 'addSubtask',
  description: 'Create a subtask under an existing task to break it into smaller pieces',
  category: 'task',
  parameters: AddSubtaskSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = AddSubtaskSchema.parse(params)
    scope(context)
    try {
      const subtask = await prisma.subtask.create({
        data: {
          taskId: p.taskId,
          workspaceId: context.workspaceId,
          title: p.title,
          description: p.description ?? null,
        },
      })
      return {
        success: true,
        data: { id: subtask.id, title: subtask.title, taskId: subtask.taskId },
        humanReadable: `Created subtask "${subtask.title}" (${subtask.id})`,
      }
    } catch (err: unknown) {
      logger.error('addSubtask tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create subtask' }
    }
  },
}

const sendEmailTool: LoopbrainTool = {
  name: 'sendEmail',
  description: 'Send a new email to someone. Use listPeople or workspace context to resolve names like "Sarah" to email addresses.',
  category: 'email',
  parameters: SendEmailSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = SendEmailSchema.parse(params)
    scope(context)
    const result = await sendGmail({
      userId: context.userId,
      workspaceId: context.workspaceId,
      to: p.to,
      subject: p.subject,
      body: p.body,
    })
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Send failed',
        humanReadable: result.userMessage ?? 'Failed to send email',
      }
    }
    return {
      success: true,
      data: { messageId: result.messageId, threadId: result.threadId },
      humanReadable: `Email sent to ${p.to}`,
    }
  },
}

const replyToEmailTool: LoopbrainTool = {
  name: 'replyToEmail',
  description: 'Reply to an existing email thread. Requires threadId and messageId from recent emails context.',
  category: 'email',
  parameters: ReplyToEmailSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = ReplyToEmailSchema.parse(params)
    scope(context)
    const result = await sendGmail({
      userId: context.userId,
      workspaceId: context.workspaceId,
      to: p.to,
      subject: p.subject,
      body: p.body,
      replyToThreadId: p.replyToThreadId,
      replyToMessageId: p.replyToMessageId,
    })
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Send failed',
        humanReadable: result.userMessage ?? 'Failed to send reply',
      }
    }
    return {
      success: true,
      data: { messageId: result.messageId, threadId: result.threadId },
      humanReadable: `Reply sent to ${p.to}`,
    }
  },
}

const createCalendarEventTool: LoopbrainTool = {
  name: 'createCalendarEvent',
  description:
    'Create a single Google Calendar event. Use listPeople or workspace context to resolve attendee names to emails.',
  category: 'calendar',
  parameters: CreateCalendarEventSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateCalendarEventSchema.parse(params)
    scope(context)
    const result = await createCalendarEvent({
      userId: context.userId,
      workspaceId: context.workspaceId,
      summary: p.summary,
      startDateTime: p.startDateTime,
      endDateTime: p.endDateTime,
      description: p.description,
      attendees: p.attendees,
      location: p.location,
      timeZone: p.timeZone,
    })
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Create failed',
        humanReadable: result.userMessage ?? 'Failed to create calendar event',
      }
    }
    return {
      success: true,
      data: { eventId: result.eventId, htmlLink: result.htmlLink },
      humanReadable: `Created calendar event "${p.summary}"${result.htmlLink ? ` — [View in Calendar](${result.htmlLink})` : ''}`,
    }
  },
}

const createMultipleCalendarEventsTool: LoopbrainTool = {
  name: 'createMultipleCalendarEvents',
  description:
    'Create multiple Google Calendar events in one step (e.g. work blocks + breaks). Use for batch scheduling like "plan my work blocks for tomorrow". Max 20 events.',
  category: 'calendar',
  parameters: CreateMultipleCalendarEventsSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateMultipleCalendarEventsSchema.parse(params)
    scope(context)
    const results: Array<{
      success: boolean
      eventId?: string
      htmlLink?: string
      summary?: string
      error?: string
    }> = []

    for (const event of p.events) {
      const result = await createCalendarEvent({
        userId: context.userId,
        workspaceId: context.workspaceId,
        summary: event.summary,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        description: event.description,
        attendees: event.attendees,
        location: event.location,
        timeZone: event.timeZone,
      })
      results.push({
        success: result.success,
        eventId: result.eventId,
        htmlLink: result.htmlLink,
        summary: event.summary,
        error: result.userMessage ?? result.error,
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    let summaryMsg: string
    if (failCount === 0) {
      summaryMsg = `Created ${successCount} event(s).`
    } else {
      const firstError = results.find((r) => !r.success)?.error ?? 'Unknown error'
      summaryMsg = `${successCount}/${p.events.length} events created. ${failCount} failed: ${firstError}`
    }

    return {
      success: true, // Don't fail the whole step — user sees partial success in summary
      data: { results, summary: summaryMsg },
      humanReadable: summaryMsg,
    }
  },
}

// ---------------------------------------------------------------------------
// READ tools — used by the planner to resolve references
// ---------------------------------------------------------------------------

const listProjectsTool: LoopbrainTool = {
  name: 'listProjects',
  description: 'List projects in the workspace, optionally filtered by status',
  category: 'project',
  parameters: ListProjectsSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = ListProjectsSchema.parse(params)
    scope(context)
    try {
      const statusVal =
        p.status && p.status !== 'ALL'
          ? (p.status as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED')
          : undefined
      const projectFilter: Record<string, unknown> = {
        workspaceId: context.workspaceId,
        isArchived: false,
        ...(statusVal ? { status: statusVal } : {}),
      }
      if (!hasToolRole(context, 'ADMIN')) {
        const accessibleIds = await getAccessibleProjectIds(context)
        projectFilter.id = { in: accessibleIds }
      }
      const projects = await prisma.project.findMany({
        where: projectFilter,
        select: { id: true, name: true, status: true, description: true },
        orderBy: { updatedAt: 'desc' },
        take: p.limit,
      })
      return {
        success: true,
        data: { projects: projects as unknown as Record<string, unknown>[] },
        humanReadable: `Found ${projects.length} project(s)`,
      }
    } catch (err: unknown) {
      logger.error('listProjects tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to list projects' }
    }
  },
}

const listPeopleTool: LoopbrainTool = {
  name: 'listPeople',
  description: 'List people (workspace members) with their names and IDs. Use this to resolve names like "Sarah" to user IDs.',
  category: 'org',
  parameters: ListPeopleSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = ListPeopleSchema.parse(params)
    scope(context)
    try {
      if (p.teamId || p.departmentId) {
        const positions = await prisma.orgPosition.findMany({
          where: {
            workspaceId: context.workspaceId,
            isActive: true,
            userId: { not: null },
            ...(p.teamId ? { teamId: p.teamId } : {}),
            ...(p.departmentId ? { team: { departmentId: p.departmentId } } : {}),
          },
          select: {
            userId: true,
            title: true,
            team: { select: { name: true, department: { select: { name: true } } } },
            user: { select: { name: true, email: true } },
          },
          take: p.limit,
        })
        const people = positions
          .filter(
            (pos): pos is typeof pos & { userId: string; user: NonNullable<typeof pos.user> } =>
              pos.userId !== null && pos.user !== null
          )
          .map((pos) => ({
            id: pos.userId,
            name: pos.user.name,
            email: pos.user.email,
            title: pos.title,
            teamName: pos.team?.name ?? null,
            departmentName: pos.team?.department?.name ?? null,
          }))
        return {
          success: true,
          data: { people: people as unknown as Record<string, unknown>[] },
          humanReadable: `Found ${people.length} people`,
        }
      }
      const members = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: context.workspaceId,
          ...(p.search
            ? {
                user: {
                  OR: [
                    { name: { contains: p.search, mode: 'insensitive' as const } },
                    { email: { contains: p.search, mode: 'insensitive' as const } },
                  ],
                },
              }
            : {}),
        },
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
        take: p.limit,
      })
      const userIds = members.map((m) => m.userId)
      const positions = await prisma.orgPosition.findMany({
        where: { workspaceId: context.workspaceId, userId: { in: userIds }, isActive: true },
        select: {
          userId: true,
          title: true,
          team: { select: { name: true, department: { select: { name: true } } } },
        },
      })
      const posMap = new Map(positions.map((pos) => [pos.userId, pos]))
      const people = members.map((m) => {
        const pos = posMap.get(m.userId)
        return {
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
          workspaceRole: m.role,
          title: pos?.title ?? null,
          teamName: pos?.team?.name ?? null,
          departmentName: pos?.team?.department?.name ?? null,
        }
      })
      return {
        success: true,
        data: { people: people as unknown as Record<string, unknown>[] },
        humanReadable: `Found ${people.length} workspace member(s)`,
      }
    } catch (err: unknown) {
      logger.error('listPeople tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to list people' }
    }
  },
}

const listTasksByAssigneeTool: LoopbrainTool = {
  name: 'listTasksByAssignee',
  description: 'List tasks assigned to a specific person, optionally filtered by project and status. Returns task IDs, titles, statuses, priorities, due dates, and project info.',
  category: 'task',
  parameters: ListTasksByAssigneeSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = ListTasksByAssigneeSchema.parse(params)
    scope(context)
    try {
      const where: Record<string, unknown> = {
        assigneeId: p.personId,
        workspaceId: context.workspaceId,
      }
      if (p.projectId) where.projectId = p.projectId
      if (p.status) where.status = p.status

      const tasks = await prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: p.limit,
      })

      const mapped = tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() ?? null,
        projectId: t.project?.id ?? null,
        projectName: t.project?.name ?? null,
      }))

      return {
        success: true,
        data: { tasks: mapped as unknown as Record<string, unknown>[], count: mapped.length },
        humanReadable: `Found ${mapped.length} task(s) assigned to person ${p.personId}${p.projectId ? ` in project` : ''}`,
      }
    } catch (err: unknown) {
      logger.error('listTasksByAssignee tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to list tasks by assignee' }
    }
  },
}

const searchEmailTool: LoopbrainTool = {
  name: 'searchEmail',
  description: "Search the user's Gmail inbox. Returns matching email threads with subject, sender, date, and snippet.",
  category: 'email',
  parameters: SearchEmailSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = SearchEmailSchema.parse(params)
    scope(context)
    try {
      const connected = await isGmailConnected(context.userId, context.workspaceId)
      if (!connected) {
        return {
          success: false,
          error: 'Gmail is not connected for this workspace. Ask the user to connect Gmail in Settings > Integrations.',
          humanReadable: 'Gmail not connected',
        }
      }
      const result = await searchGmailForContext(context.userId, context.workspaceId, p.query)
      return {
        success: true,
        data: {
          emails: result.threads.slice(0, 10).map((t) => ({
            id: t.id,
            threadId: t.threadId,
            subject: t.subject,
            from: t.from,
            date: t.date.toISOString(),
            snippet: (t.snippet || t.bodyPreview).slice(0, 200),
          })),
        },
        humanReadable: `Found ${result.threads.length} email(s)`,
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to search email' }
    }
  },
}

const getCalendarEventsTool: LoopbrainTool = {
  name: 'getCalendarEvents',
  description: 'Get calendar events for a date range. Returns event title, time, attendees, and location.',
  category: 'calendar',
  parameters: GetCalendarEventsSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = GetCalendarEventsSchema.parse(params)
    scope(context)
    try {
      const start = p.startDate ? new Date(p.startDate) : new Date()
      const end = p.endDate
        ? new Date(p.endDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const account = await prismaUnscoped.account.findFirst({
        where: { userId: context.userId, provider: 'google' },
        select: { refresh_token: true, scope: true },
      })
      let hasRefreshToken = !!account?.refresh_token
      if (!hasRefreshToken) {
        try {
          const session = await getServerSession(authOptions)
          if (session?.refreshToken) hasRefreshToken = true
        } catch {
          // JWT session fallback is best-effort
        }
      }
      if (!hasRefreshToken) {
        return {
          success: false,
          error: 'Google Calendar is not connected. Please sign in with Google to access your calendar.',
          humanReadable: 'Calendar not connected',
        }
      }
      const hasCalendarScope = account?.scope?.includes('calendar')
      if (account && !hasCalendarScope) {
        return {
          success: false,
          error: 'Google Calendar access not granted. Please sign out and sign in again to grant calendar permissions.',
          humanReadable: 'Calendar scope not granted',
        }
      }
      const events = await loadCalendarEvents(context.workspaceId, context.userId, start, end)
      return {
        success: true,
        data: {
          events: events.slice(0, 20).map((e) => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
            isAllDay: e.isAllDay,
            status: e.status,
          })),
        },
        humanReadable: `Found ${events.length} calendar event(s)`,
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: `Calendar error: ${err instanceof Error ? err.message : String(err)}`,
        humanReadable: 'Failed to load calendar events',
      }
    }
  },
}

const searchSlackMessagesTool: LoopbrainTool = {
  name: 'searchSlackMessages',
  description: 'Search Slack messages for context. Returns matching messages with channel, author, and timestamp.',
  category: 'slack',
  parameters: SearchSlackMessagesSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = SearchSlackMessagesSchema.parse(params)
    scope(context)
    try {
      const slackConnected = await isSlackAvailable(context.workspaceId)
      if (!slackConnected) {
        return {
          success: false,
          error: 'Slack is not connected to this workspace. An admin can connect it in Settings > Integrations.',
          humanReadable: 'Slack not connected',
        }
      }
      const result = await searchSlackMessages(context.workspaceId, p.query)
      return {
        success: true,
        data: {
          messages: result.messages.slice(0, 20).map((m) => ({
            channelName: m.channelName,
            userName: m.userName,
            text: m.text.slice(0, 500),
            timestamp: m.timestamp,
            threadTs: m.threadTs,
          })),
        },
        humanReadable: `Found ${result.messages.length} Slack message(s)`,
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to search Slack' }
    }
  },
}

const getPersonProfileTool: LoopbrainTool = {
  name: 'getPersonProfile',
  description: 'Get detailed profile for a specific person — their projects, tasks, skills, reporting chain, and availability.',
  category: 'org',
  parameters: GetPersonProfileSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = GetPersonProfileSchema.parse(params)
    scope(context)
    try {
      const [member, position, projectMemberships] = await Promise.all([
        prisma.workspaceMember.findFirst({
          where: { workspaceId: context.workspaceId, userId: p.personId },
          select: {
            userId: true,
            role: true,
            user: { select: { name: true, email: true } },
          },
        }),
        prisma.orgPosition.findFirst({
          where: { workspaceId: context.workspaceId, userId: p.personId, isActive: true },
          select: {
            title: true,
            level: true,
            team: { select: { name: true, department: { select: { name: true } } } },
            parent: { select: { title: true, user: { select: { name: true } } } },
          },
        }),
        prisma.projectMember.findMany({
          where: { workspaceId: context.workspaceId, userId: p.personId },
          select: {
            role: true,
            project: { select: { id: true, name: true, status: true } },
          },
          take: 10,
        }),
      ])
      if (!member) {
        return { success: false, error: `Person ${p.personId} not found in workspace`, humanReadable: 'Person not found' }
      }
      const profile: Record<string, unknown> = {
        id: p.personId,
        userId: p.personId,
        name: member.user.name,
        email: member.user.email,
        workspaceRole: member.role,
        title: position?.title ?? null,
        level: position?.level ?? null,
        team: position?.team?.name ?? null,
        department: position?.team?.department?.name ?? null,
        manager: position?.parent?.user?.name ?? position?.parent?.title ?? null,
        projects: projectMemberships.map((pm) => ({
          id: pm.project.id,
          name: pm.project.name,
          status: pm.project.status,
          role: pm.role,
        })),
      }
      const filtered = await filterPersonData(profile, context)
      return {
        success: true,
        data: filtered,
        humanReadable: `Got profile for ${member.user.name}`,
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to get person profile' }
    }
  },
}

const searchWikiTool: LoopbrainTool = {
  name: 'searchWiki',
  description: 'Semantic search across workspace wiki pages. Returns matching pages with title, content snippet, and author.',
  category: 'wiki',
  parameters: SearchWikiSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = SearchWikiSchema.parse(params)
    scope(context)
    try {
      const limit = Math.min(p.limit ?? 5, 10)
      try {
        const semanticResults = await searchSimilarContextItems({
          workspaceId: context.workspaceId,
          query: p.query,
          type: ContextType.PAGE,
          limit,
        })
        if (semanticResults.length > 0) {
          const pageIds = semanticResults.map((r) => r.contextId)
          const pages = await prisma.wikiPage.findMany({
            where: { workspaceId: context.workspaceId, id: { in: pageIds } },
            select: { id: true, title: true, slug: true },
          })
          const pageMap = new Map(pages.map((pg) => [pg.id, pg]))
          return {
            success: true,
            data: {
              pages: semanticResults.map((r) => ({
                pageId: r.contextId,
                title: pageMap.get(r.contextId)?.title ?? r.title,
                slug: pageMap.get(r.contextId)?.slug,
                score: r.score,
              })),
            },
            humanReadable: `Found ${semanticResults.length} wiki page(s)`,
          }
        }
      } catch {
        // fall through to keyword search
      }
      const pages = await prisma.wikiPage.findMany({
        where: {
          workspaceId: context.workspaceId,
          isPublished: true,
          title: { contains: p.query, mode: 'insensitive' },
        },
        select: { id: true, title: true, slug: true },
        take: limit,
      })
      return {
        success: true,
        data: {
          pages: pages.map((pg) => ({ pageId: pg.id, title: pg.title, slug: pg.slug, score: 1 })),
        },
        humanReadable: `Found ${pages.length} wiki page(s)`,
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to search wiki' }
    }
  },
}

const queryOrgTool: LoopbrainTool = {
  name: 'queryOrg',
  description: 'Query organizational data — people, teams, departments, reporting chains, roles.',
  category: 'org',
  parameters: QueryOrgSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    scope(context)
    try {
      const engine = new PrismaContextEngine()
      const ctx = await engine.getOrgContext(context.workspaceId)
      if (!ctx) {
        return { success: true, data: { message: 'No org data found for this workspace' }, humanReadable: 'No org data' }
      }
      return {
        success: true,
        data: {
          teams: (ctx.teams ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            department: t.department,
            memberCount: t.memberCount,
          })),
          departments: (ctx.departments ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            teamCount: d.teamCount,
          })),
          roles: (ctx.roles ?? []).slice(0, 50).map((r) => ({
            id: r.id,
            title: r.title,
            teamName: r.teamName ?? null,
            department: r.department ?? null,
            userName: r.userName ?? null,
          })),
        },
        humanReadable: 'Got org context',
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to query org' }
    }
  },
}

const getCapacityTool: LoopbrainTool = {
  name: 'getCapacity',
  description: 'Get capacity and workload data for a person or team. Returns current allocation, availability, and utilization.',
  category: 'org',
  parameters: GetCapacitySchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = GetCapacitySchema.parse(params)
    scope(context)
    try {
      if (p.personId) {
        const snapshot = await buildWorkloadAnalysis(context.workspaceId, p.personId)
        return {
          success: true,
          data: {
            personId: snapshot.personId,
            name: snapshot.personName,
            assessment: snapshot.summary.assessment,
            utilizationPct: Math.round(snapshot.capacityComparison.utilizationPct * 100),
            hasCapacity: snapshot.capacityComparison.hasCapacity,
            headroomHours: Math.round(snapshot.capacityComparison.headroomHours),
            contractedHours: snapshot.capacityComparison.contractedHours,
            taskCount: snapshot.taskLoad.totalCount,
            overdueCount: snapshot.taskLoad.overdue.count,
            primaryConcern: snapshot.summary.primaryConcern,
            projects: snapshot.projectLoad.slice(0, 5).map((proj) => ({
              projectId: proj.projectId,
              name: proj.projectName,
              allocationPct: proj.allocationPct,
              taskCount: proj.taskCount,
            })),
          },
          humanReadable: `Got capacity for ${snapshot.personName}`,
        }
      }
      let memberFilter: Record<string, unknown> = { workspaceId: context.workspaceId }
      if (!hasToolRole(context, 'ADMIN')) {
        const accessibleIds = await getAccessiblePersonIds(context)
        memberFilter = { workspaceId: context.workspaceId, userId: { in: accessibleIds } }
      }
      const members = await prisma.workspaceMember.findMany({
        where: memberFilter,
        select: { userId: true, user: { select: { name: true } } },
        take: 20,
      })
      const summaries = await Promise.all(
        members.map(async (m) => {
          try {
            const s = await buildWorkloadAnalysis(context.workspaceId, m.userId, {
              includeNextWeek: false,
              includeWorkRequests: false,
            })
            return {
              personId: m.userId,
              name: m.user.name,
              assessment: s.summary.assessment,
              utilizationPct: Math.round(s.capacityComparison.utilizationPct * 100),
              hasCapacity: s.capacityComparison.hasCapacity,
            }
          } catch {
            return {
              personId: m.userId,
              name: m.user.name,
              assessment: 'UNKNOWN',
              utilizationPct: 0,
              hasCapacity: null,
            }
          }
        })
      )
      return {
        success: true,
        data: { members: summaries },
        humanReadable: `Got capacity for ${summaries.length} member(s)`,
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to get capacity' }
    }
  },
}

const getProjectHealthTool: LoopbrainTool = {
  name: 'getProjectHealth',
  description: "Get health status and insights for a project. Returns blockers, risks, velocity, and commendations.",
  category: 'project',
  parameters: GetProjectHealthSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'VIEWER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = GetProjectHealthSchema.parse(params)
    scope(context)
    try {
      if (!hasToolRole(context, 'ADMIN')) {
        try {
          await assertProjectMembership(context, p.projectId)
        } catch {
          return {
            success: false,
            error: 'You do not have access to this project',
            humanReadable: 'Access denied',
          }
        }
      }
      const [project, tasks] = await Promise.all([
        prisma.project.findFirst({
          where: { id: p.projectId, workspaceId: context.workspaceId },
          select: { id: true, name: true, status: true, updatedAt: true },
        }),
        prisma.task.findMany({
          where: { projectId: p.projectId, workspaceId: context.workspaceId },
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
          take: 200,
        }),
      ])
      if (!project) {
        return { success: false, error: `Project ${p.projectId} not found`, humanReadable: 'Project not found' }
      }
      const now = new Date()
      const total = tasks.length
      const done = tasks.filter((t) => t.status === 'DONE').length
      const blocked = tasks.filter((t) => t.status === 'BLOCKED').length
      const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length
      const overdue = tasks.filter(
        (t) => t.dueDate && t.dueDate < now && t.status !== 'DONE'
      ).length
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const isStalled = project.updatedAt < sevenDaysAgo && inProgress === 0
      const rawHealth = 100 - blocked * 15 - overdue * 8 - (isStalled ? 20 : 0)
      return {
        success: true,
        data: {
          projectId: project.id,
          name: project.name,
          status: project.status,
          healthScore: Math.max(0, Math.min(100, rawHealth)),
          completionRate,
          taskSummary: { total, done, blocked, inProgress, overdue },
          isStalled,
          blockers: tasks
            .filter((t) => t.status === 'BLOCKED')
            .slice(0, 5)
            .map((t) => ({ id: t.id, title: t.title })),
        },
        humanReadable: `Got health for project "${project.name}"`,
      }
    } catch (err: unknown) {
      return { success: false, error: String(err), humanReadable: 'Failed to get project health' }
    }
  },
}

const bulkReassignTasksTool: LoopbrainTool = {
  name: 'bulkReassignTasks',
  description: 'Reassign multiple tasks to a new assignee in a single operation. Use after listTasksByAssignee to get the task IDs.',
  category: 'task',
  parameters: BulkReassignTasksSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = BulkReassignTasksSchema.parse(params)
    // Accept either explicit taskIds or a full tasks array (e.g. passed from $stepN.data.tasks)
    const ids = p.taskIds ?? p.tasks?.map(t => t.id) ?? []
    if (ids.length === 0) {
      return { success: false, error: 'No tasks provided', humanReadable: 'No tasks to reassign.' }
    }
    scope(context)
    try {
      // Verify new assignee exists in workspace
      const assignee = await prisma.workspaceMember.findFirst({
        where: { userId: p.newAssigneeId, workspaceId: context.workspaceId },
        include: { user: { select: { id: true, name: true } } },
      })
      if (!assignee) {
        return { success: false, error: 'Assignee not found in workspace', humanReadable: 'The target assignee is not a member of this workspace.' }
      }

      // Verify all tasks exist and belong to this workspace
      const tasks = await prisma.task.findMany({
        where: { id: { in: ids }, workspaceId: context.workspaceId },
        select: { id: true, title: true, projectId: true },
      })
      if (tasks.length !== ids.length) {
        const found = new Set(tasks.map(t => t.id))
        const missing = ids.filter(id => !found.has(id))
        return { success: false, error: `Tasks not found: ${missing.join(', ')}`, humanReadable: `${missing.length} task(s) not found in this workspace.` }
      }

      // Bulk update
      const result = await prisma.task.updateMany({
        where: { id: { in: ids }, workspaceId: context.workspaceId },
        data: { assigneeId: p.newAssigneeId },
      })

      // TODO: re-index affected tasks after bulk reassign

      return {
        success: true,
        data: { reassignedCount: result.count, assigneeId: p.newAssigneeId, assigneeName: assignee.user?.name ?? 'Unknown' },
        humanReadable: `Reassigned ${result.count} task(s) to ${assignee.user?.name ?? p.newAssigneeId}`,
      }
    } catch (err: unknown) {
      logger.error('bulkReassignTasks tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to reassign tasks' }
    }
  },
}

const removeProjectMemberTool: LoopbrainTool = {
  name: 'removeProjectMember',
  description: 'Remove a person from a project. This removes their project membership but does not delete their tasks — reassign tasks first if needed.',
  category: 'project',
  parameters: RemoveProjectMemberSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'ADMIN', resourceChecks: ['projectMembership'] },
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = RemoveProjectMemberSchema.parse(params)
    scope(context)
    try {
      // Verify project exists in workspace
      const project = await prisma.project.findFirst({
        where: { id: p.projectId, workspaceId: context.workspaceId },
        select: { id: true, name: true },
      })
      if (!project) {
        return { success: false, error: 'Project not found', humanReadable: 'Project not found in this workspace.' }
      }

      // Try ProjectMember first (primary membership model)
      const memberDeleteResult = await prisma.projectMember.deleteMany({
        where: { projectId: p.projectId, userId: p.personId, workspaceId: context.workspaceId },
      })

      if (memberDeleteResult.count > 0) {
        return {
          success: true,
          data: { projectId: p.projectId, projectName: project.name, removedPersonId: p.personId },
          humanReadable: `Removed person from project "${project.name}"`,
        }
      }

      // Try ProjectPersonLink as fallback
      const linkDeleteResult = await prisma.projectPersonLink.deleteMany({
        where: { projectId: p.projectId, userId: p.personId, workspaceId: context.workspaceId },
      })

      if (linkDeleteResult.count > 0) {
        return {
          success: true,
          data: { projectId: p.projectId, projectName: project.name, removedPersonId: p.personId },
          humanReadable: `Removed person from project "${project.name}"`,
        }
      }

      return { success: false, error: 'Person is not a member of this project', humanReadable: `This person is not a member of "${project.name}".` }
    } catch (err: unknown) {
      logger.error('removeProjectMember tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to remove project member' }
    }
  },
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const ALL_TOOLS: LoopbrainTool[] = [
  createProjectTool,
  createTaskTool,
  createEpicTool,
  assignTaskTool,
  createTodoTool,
  readWikiPageTool,
  createWikiPageTool,
  draftWikiPageTool,
  createGoalTool,
  addPersonToProjectTool,
  assignToProjectTool,
  createTimeOffTool,
  assignManagerTool,
  createPersonTool,
  updateTaskStatusTool,
  updateProjectTool,
  linkProjectToGoalTool,
  addSubtaskTool,
  sendEmailTool,
  replyToEmailTool,
  createCalendarEventTool,
  createMultipleCalendarEventsTool,
  listProjectsTool,
  listPeopleTool,
  listTasksByAssigneeTool,
  searchEmailTool,
  getCalendarEventsTool,
  searchSlackMessagesTool,
  getPersonProfileTool,
  searchWikiTool,
  queryOrgTool,
  getCapacityTool,
  getProjectHealthTool,
  bulkReassignTasksTool,
  removeProjectMemberTool,
  searchDriveFilesTool,
  readDriveDocumentTool,
  createDriveDocumentTool,
  updateDriveDocumentTool,
]

export class ToolRegistry {
  private tools: Map<string, LoopbrainTool>

  constructor() {
    this.tools = new Map()
    for (const tool of ALL_TOOLS) {
      this.tools.set(tool.name, tool)
    }
  }

  get(name: string): LoopbrainTool | undefined {
    return this.tools.get(name)
  }

  getAll(): LoopbrainTool[] {
    return Array.from(this.tools.values())
  }

  getByCategory(category: string): LoopbrainTool[] {
    return this.getAll().filter((t) => t.category === category)
  }

  /** Return ToolDefinition[] for the compiler (only tools with real implementations) */
  toToolDefinitions(): import('@/lib/ai/providers').ToolDefinition[] {
    return this.getAll().map((t) => {
      let parameters: Record<string, unknown> = {}
      try {
        if ('shape' in t.parameters) {
          const shape = (t.parameters as z.ZodObject<z.ZodRawShape>).shape
          const props: Record<string, unknown> = {}
          const required: string[] = []
          for (const [key, val] of Object.entries(shape)) {
            const zVal = val as z.ZodTypeAny
            props[key] = { type: 'string', description: key }
            if (!zVal.isOptional()) required.push(key)
          }
          parameters = { type: 'object', properties: props, required }
        }
      } catch {
        parameters = { type: 'object', properties: {} }
      }
      return { name: t.name, description: t.description, parameters }
    })
  }

  /** Build a concise tool-spec block for the planner LLM prompt */
  toPromptSpec(): string {
    return this.getAll()
      .map((t) => {
        const schema = t.parameters
        let paramDesc = ''
        try {
          if ('shape' in schema) {
            const shape = (schema as z.ZodObject<z.ZodRawShape>).shape
            paramDesc = Object.entries(shape)
              .map(([key, val]) => {
                const zVal = val as z.ZodTypeAny
                const optional = zVal.isOptional() ? '(optional)' : '(required)'
                return `    ${key} ${optional}`
              })
              .join('\n')
          }
        } catch {
          paramDesc = '    (see schema)'
        }
        return `- ${t.name}: ${t.description}\n  confirmation: ${t.requiresConfirmation}\n  params:\n${paramDesc}`
      })
      .join('\n\n')
  }
}

/** Singleton registry instance */
export const toolRegistry = new ToolRegistry()
