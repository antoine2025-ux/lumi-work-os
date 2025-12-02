/**
 * ContextObject Builder Functions
 * 
 * Pure, side-effect-free functions that convert domain entities (Prisma models)
 * into unified ContextObjects. These builders handle all mapping logic, including
 * status normalization, relation building, and summary generation.
 */

import { Prisma } from '@prisma/client'
import { ContextObject, ContextObjectType, ContextRelation } from './context-types'

// Type aliases for Prisma models with common includes
type ProjectModel = Prisma.ProjectGetPayload<{
  include: {
    owner: true
  }
}>

type TaskModel = Prisma.TaskGetPayload<{
  include: {
    project: true
    assignee: true
  }
}>

type PageModel = Prisma.WikiPageGetPayload<{
  include: {
    createdBy: true
    projects: true
  }
}>

type RoleModel = Prisma.OrgPositionGetPayload<{
  include: {
    user: true
    team: true
  }
}>

type UserModel = Prisma.UserGetPayload<Record<string, never>>

type TeamModel = Prisma.OrgTeamGetPayload<Record<string, never>>

/**
 * Normalize project status to a standard string
 */
function normalizeProjectStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    ON_HOLD: 'on-hold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  }
  return statusMap[status] || status.toLowerCase()
}

/**
 * Normalize task status to a standard string
 */
function normalizeTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    TODO: 'todo',
    IN_PROGRESS: 'in-progress',
    IN_REVIEW: 'in-review',
    DONE: 'done',
    BLOCKED: 'blocked'
  }
  return statusMap[status] || status.toLowerCase()
}

/**
 * Normalize priority to a standard string
 */
function normalizePriority(priority: string): string {
  return priority.toLowerCase()
}

/**
 * Build summary for a project
 */
function buildProjectSummary(
  project: { status: string; department: string | null; priority: string; isArchived?: boolean }
): string {
  const status = normalizeProjectStatus(project.status)
  const department = project.department || 'Unknown department'
  const priority = normalizePriority(project.priority)
  const archived = project.isArchived ? ' (archived)' : ''
  return `${status} project in ${department} (priority: ${priority})${archived}`
}

/**
 * Build summary for a task
 */
function buildTaskSummary(
  task: { status: string; assignee?: { name: string | null } | null; project?: { name: string } | null }
): string {
  const status = normalizeTaskStatus(task.status)
  const assigneePart = task.assignee?.name ? ` assigned to ${task.assignee.name}` : ''
  const projectPart = task.project?.name ? ` in project ${task.project.name}` : ''
  return `${status} task${assigneePart}${projectPart}`
}

/**
 * Build summary for a page
 */
function buildPageSummary(
  page: { excerpt: string | null; content: string; category: string; isPublished: boolean }
): string {
  const excerpt = page.excerpt || (page.content ? page.content.substring(0, 100) : '')
  const truncated = excerpt.length > 100 ? excerpt.substring(0, 100) + '...' : excerpt
  const published = page.isPublished ? 'published' : 'draft'
  return `${published} page in ${page.category || 'general'} category${truncated ? ': ' + truncated : ''}`
}

/**
 * Build summary for a role
 */
function buildRoleSummary(
  role: { title: string; level: number; user?: { name: string | null } | null; team?: { name: string } | null }
): string {
  const userPart = role.user?.name ? ` held by ${role.user.name}` : ' (vacant)'
  const teamPart = role.team?.name ? ` in team ${role.team.name}` : ''
  return `Level ${role.level} ${role.title}${userPart}${teamPart}`
}

/**
 * Build tags array for a project
 */
function buildProjectTags(project: {
  status: string
  priority: string
  department: string | null
  team: string | null
  isArchived?: boolean
}): string[] {
  const tags: string[] = []
  tags.push(normalizeProjectStatus(project.status))
  tags.push(normalizePriority(project.priority))
  if (project.department) {
    tags.push(`department:${project.department}`)
  }
  if (project.team) {
    tags.push(`team:${project.team}`)
  }
  if (project.isArchived) {
    tags.push('archived')
  }
  return tags
}

/**
 * Build tags array for a task
 */
function buildTaskTags(task: {
  status: string
  priority: string
  tags: string[]
}): string[] {
  const normalizedTags: string[] = []
  normalizedTags.push(normalizeTaskStatus(task.status))
  normalizedTags.push(normalizePriority(task.priority))
  // Add existing tags from the task
  normalizedTags.push(...task.tags)
  return normalizedTags
}

/**
 * Build tags array for a page
 */
function buildPageTags(page: {
  tags: string[]
  category: string
  isPublished: boolean
}): string[] {
  const normalizedTags: string[] = []
  normalizedTags.push(...page.tags)
  if (page.category) {
    normalizedTags.push(`category:${page.category}`)
  }
  normalizedTags.push(page.isPublished ? 'published' : 'draft')
  return normalizedTags
}

/**
 * Build tags array for a role
 */
function buildRoleTags(role: {
  level: number
  team?: { name: string } | null
  isActive?: boolean
}): string[] {
  const tags: string[] = []
  tags.push(`level:${role.level}`)
  if (role.team?.name) {
    tags.push(`team:${role.team.name}`)
  }
  if (role.isActive === false) {
    tags.push('inactive')
  }
  return tags
}

/**
 * Convert a Project to a ContextObject
 */
export function projectToContext(
  project: ProjectModel,
  options?: {
    owner?: UserModel | null
    team?: TeamModel | null
  }
): ContextObject {
  const relations: ContextRelation[] = []

  // Relation to owner
  if (project.ownerId) {
    relations.push({
      type: 'person',
      id: project.ownerId,
      label: 'owner',
      direction: 'out'
    })
  } else if (options?.owner?.id) {
    relations.push({
      type: 'person',
      id: options.owner.id,
      label: 'owner',
      direction: 'out'
    })
  }

  // Relation to team (if team name is provided, we can't link to team ID without fetching)
  // For now, we'll skip team relation if we don't have a team model with ID
  if (options?.team?.id) {
    relations.push({
      type: 'team',
      id: options.team.id,
      label: 'team',
      direction: 'out'
    })
  }

  const tags = buildProjectTags({
    status: project.status,
    priority: project.priority,
    department: project.department,
    team: project.team,
    isArchived: project.isArchived
  })

  return {
    id: project.id,
    type: 'project',
    title: project.name,
    summary: buildProjectSummary({
      status: project.status,
      department: project.department,
      priority: project.priority,
      isArchived: project.isArchived
    }),
    tags,
    ownerId: project.ownerId || undefined,
    status: normalizeProjectStatus(project.status),
    updatedAt: project.updatedAt,
    relations,
    metadata: {
      priority: project.priority,
      department: project.department || undefined,
      team: project.team || undefined,
      color: project.color || undefined,
      startDate: project.startDate?.toISOString() || undefined,
      endDate: project.endDate?.toISOString() || undefined,
      isArchived: project.isArchived
    }
  }
}

/**
 * Convert a Task to a ContextObject
 */
export function taskToContext(
  task: TaskModel,
  options?: {
    project?: ProjectModel | null
    assignee?: UserModel | null
  }
): ContextObject {
  const relations: ContextRelation[] = []

  // Relation to project
  if (task.projectId) {
    relations.push({
      type: 'project',
      id: task.projectId,
      label: 'project',
      direction: 'out'
    })
  } else if (options?.project?.id) {
    relations.push({
      type: 'project',
      id: options.project.id,
      label: 'project',
      direction: 'out'
    })
  } else if (task.project?.id) {
    relations.push({
      type: 'project',
      id: task.project.id,
      label: 'project',
      direction: 'out'
    })
  }

  // Relation to assignee
  if (task.assigneeId) {
    relations.push({
      type: 'person',
      id: task.assigneeId,
      label: 'assignee',
      direction: 'out'
    })
  } else if (options?.assignee?.id) {
    relations.push({
      type: 'person',
      id: options.assignee.id,
      label: 'assignee',
      direction: 'out'
    })
  } else if (task.assignee?.id) {
    relations.push({
      type: 'person',
      id: task.assignee.id,
      label: 'assignee',
      direction: 'out'
    })
  }

  const tags = buildTaskTags({
    status: task.status,
    priority: task.priority,
    tags: task.tags
  })

  return {
    id: task.id,
    type: 'task',
    title: task.title,
    summary: buildTaskSummary({
      status: task.status,
      assignee: task.assignee || options?.assignee || null,
      project: task.project || options?.project || null
    }),
    tags,
    ownerId: task.assigneeId || undefined,
    status: normalizeTaskStatus(task.status),
    updatedAt: task.updatedAt,
    relations,
    metadata: {
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() || undefined,
      completedAt: task.completedAt?.toISOString() || undefined,
      order: task.order,
      points: task.points || undefined,
      epicId: task.epicId || undefined,
      milestoneId: task.milestoneId || undefined
    }
  }
}

/**
 * Convert a WikiPage to a ContextObject
 */
export function pageToContext(
  page: PageModel,
  options?: {
    project?: ProjectModel | null
    owner?: UserModel | null
  }
): ContextObject {
  const relations: ContextRelation[] = []

  // Relation to project (if page is linked to a project)
  if (page.projects && page.projects.length > 0) {
    const firstProject = page.projects[0]
    relations.push({
      type: 'project',
      id: firstProject.id,
      label: 'project',
      direction: 'out'
    })
  } else if (options?.project?.id) {
    relations.push({
      type: 'project',
      id: options.project.id,
      label: 'project',
      direction: 'out'
    })
  }

  // Relation to owner/creator
  if (page.createdById) {
    relations.push({
      type: 'person',
      id: page.createdById,
      label: 'created by',
      direction: 'out'
    })
  } else if (options?.owner?.id) {
    relations.push({
      type: 'person',
      id: options.owner.id,
      label: 'created by',
      direction: 'out'
    })
  }

  const tags = buildPageTags({
    tags: page.tags,
    category: page.category,
    isPublished: page.isPublished
  })

  return {
    id: page.id,
    type: 'page',
    title: page.title,
    summary: buildPageSummary({
      excerpt: page.excerpt,
      content: page.content,
      category: page.category,
      isPublished: page.isPublished
    }),
    tags,
    ownerId: page.createdById || undefined,
    status: page.isPublished ? 'published' : 'draft',
    updatedAt: page.updatedAt,
    relations,
    metadata: {
      slug: page.slug,
      category: page.category || undefined,
      permissionLevel: page.permissionLevel || undefined,
      viewCount: page.view_count || undefined,
      isFeatured: page.is_featured || undefined,
      workspaceType: page.workspace_type || undefined
    }
  }
}

/**
 * Convert an OrgPosition (role) to a ContextObject
 */
export function roleToContext(
  role: RoleModel,
  options?: {
    person?: UserModel | null
    team?: TeamModel | null
  }
): ContextObject {
  const relations: ContextRelation[] = []

  // Relation to person occupying the role
  if (role.userId) {
    relations.push({
      type: 'person',
      id: role.userId,
      label: 'occupied by',
      direction: 'out'
    })
  } else if (options?.person?.id) {
    relations.push({
      type: 'person',
      id: options.person.id,
      label: 'occupied by',
      direction: 'out'
    })
  } else if (role.user?.id) {
    relations.push({
      type: 'person',
      id: role.user.id,
      label: 'occupied by',
      direction: 'out'
    })
  }

  // Relation to team
  if (role.teamId) {
    relations.push({
      type: 'team',
      id: role.teamId,
      label: 'team',
      direction: 'out'
    })
  } else if (options?.team?.id) {
    relations.push({
      type: 'team',
      id: options.team.id,
      label: 'team',
      direction: 'out'
    })
  } else if (role.team?.id) {
    relations.push({
      type: 'team',
      id: role.team.id,
      label: 'team',
      direction: 'out'
    })
  }

  const tags = buildRoleTags({
    level: role.level,
    team: role.team || options?.team || null,
    isActive: role.isActive
  })

  return {
    id: role.id,
    type: 'role',
    title: role.title,
    summary: buildRoleSummary({
      title: role.title,
      level: role.level,
      user: role.user || options?.person || null,
      team: role.team || options?.team || null
    }),
    tags,
    ownerId: role.userId || undefined,
    status: role.isActive ? 'active' : 'inactive',
    updatedAt: role.updatedAt,
    relations,
    metadata: {
      level: role.level,
      order: role.order,
      roleDescription: role.roleDescription || undefined,
      responsibilities: role.responsibilities.length > 0 ? role.responsibilities : undefined,
      requiredSkills: role.requiredSkills.length > 0 ? role.requiredSkills : undefined,
      preferredSkills: role.preferredSkills.length > 0 ? role.preferredSkills : undefined,
      keyMetrics: role.keyMetrics.length > 0 ? role.keyMetrics : undefined
    }
  }
}



