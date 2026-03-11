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
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { sendGmail } from '@/lib/integrations/gmail-send'
import { createCalendarEvent } from '@/lib/integrations/calendar-events'
import { logger } from '@/lib/logger'
import type { LoopbrainTool, AgentContext, ToolResult, ToolPermissions } from './types'
import { getDefaultSpaceForUser } from '@/lib/spaces/get-default-space'
import { searchDriveFilesTool } from './tools/drive/search-drive-files'
import { readDriveDocumentTool } from './tools/drive/read-drive-document'
import { createDriveDocumentTool } from './tools/drive/create-drive-document'
import { updateDriveDocumentTool } from './tools/drive/update-drive-document'
import { extractTextFromProseMirror, isValidProseMirrorJSON } from '@/lib/wiki/text-extract'

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

const ListProjectsSchema = z.object({
  status: z.preprocess(
    normalizeEnum,
    z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
  ).optional(),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(50).optional().default(20)),
})

const ListPeopleSchema = z.object({
  search: z.string().optional(),
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
  summary: z.string().min(1),
  startDateTime: z.string(),
  endDateTime: z.string(),
  description: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
})

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

      return {
        success: true,
        data: {
          id: page.id,
          slug: page.slug,
          title: page.title,
          topic: p.topic,
          outline: p.outline,
          // Marker for the agent-loop to trigger background drafting
          _draftTask: {
            pageId: page.id,
            topic: p.topic,
            outline: p.outline,
          },
          // Client action — navigate to the new page
          _clientAction: {
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
      const projects = await prisma.project.findMany({
        where: {
          workspaceId: context.workspaceId,
          isArchived: false,
          ...(p.status ? { status: p.status } : {}),
        },
        select: { id: true, name: true, status: true, priority: true },
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
      const people = members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }))
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
