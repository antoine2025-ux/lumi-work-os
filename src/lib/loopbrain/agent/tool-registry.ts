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
import { logger } from '@/lib/logger'
import type { LoopbrainTool, AgentContext, ToolResult } from './types'

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

const ListProjectsSchema = z.object({
  status: z.preprocess(
    normalizeEnum,
    z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
  ).optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
})

const ListPeopleSchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
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
  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateProjectSchema.parse(params)
    scope(context)
    try {
      const project = await prisma.project.create({
        data: {
          workspaceId: context.workspaceId,
          name: p.name,
          description: p.description ?? null,
          status: p.status,
          priority: p.priority,
          createdById: context.userId,
        },
      })
      return {
        success: true,
        data: { id: project.id, name: project.name },
        humanReadable: `Created project "${project.name}" (${project.id})`,
      }
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      logger.error('createTodo tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create to-do' }
    }
  },
}

const createWikiPageTool: LoopbrainTool = {
  name: 'createWikiPage',
  description: 'Create a new wiki page in the workspace',
  category: 'wiki',
  parameters: CreateWikiPageSchema,
  requiresConfirmation: true,
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
    } catch (err) {
      logger.error('createWikiPage tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create wiki page' }
    }
  },
}

const createGoalTool: LoopbrainTool = {
  name: 'createGoal',
  description: 'Create a new goal/OKR for the workspace',
  category: 'goal',
  parameters: CreateGoalSchema,
  requiresConfirmation: true,
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      logger.error('addSubtask tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to create subtask' }
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
    } catch (err) {
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
    } catch (err) {
      logger.error('listPeople tool failed', { err, context })
      return { success: false, error: String(err), humanReadable: 'Failed to list people' }
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
  createWikiPageTool,
  createGoalTool,
  addPersonToProjectTool,
  updateTaskStatusTool,
  updateProjectTool,
  linkProjectToGoalTool,
  addSubtaskTool,
  listProjectsTool,
  listPeopleTool,
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
