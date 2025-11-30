/**
 * Loopbrain Context Engine
 * 
 * Prisma-backed implementation for retrieving contextual information
 * for Loopbrain's AI system. Fetches data from domain models and maps
 * to canonical ContextObject types.
 */

import { prisma } from '@/lib/db'
import {
  ContextObject,
  ContextType,
  ContextScope,
  WorkspaceContext,
  PageContext,
  ProjectContext,
  TaskContext,
  OrgContext,
  ActivityContext,
  UnifiedContext,
  Breadcrumb,
  RelatedDoc,
  EpicSummary,
  TaskSummary,
  ProjectSummary,
  TeamSummary,
  RoleSummary,
  DepartmentSummary,
  OrgHierarchyNode,
  ActivitySummary
} from './context-types'
import {
  saveContextItem,
  getContextItem,
  deserializeContextObject
} from './store'
import { logger } from '@/lib/logger'
import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'
import { projectToContext, taskToContext, pageToContext, roleToContext } from '@/lib/context/context-builders'

/**
 * Options for context retrieval
 */
export interface ContextOptions {
  scope?: ContextScope
  includeRelated?: boolean
  limit?: number
  filters?: {
    status?: string[]
    tags?: string[]
    categories?: string[]
    dateRange?: {
      from: string
      to: string
    }
    [key: string]: unknown
  }
  metadata?: Record<string, unknown>
}

/**
 * Context Engine Interface
 * 
 * Defines the contract for retrieving contextual information.
 * Implementations should fetch data from the database and format it
 * according to the canonical context types.
 */
export interface ContextEngine {
  /**
   * Get workspace-level context
   * @param workspaceId - The workspace ID
   * @param options - Optional context retrieval options
   * @returns Workspace context with high-level information, or null if not found
   */
  getWorkspaceContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<WorkspaceContext | null>

  /**
   * Get page (wiki) context
   * @param pageId - The page ID
   * @param workspaceId - The workspace ID for scoping
   * @param options - Optional context retrieval options
   * @returns Page context with content, related docs, breadcrumbs, or null if not found
   */
  getPageContext(
    pageId: string,
    workspaceId: string,
    options?: ContextOptions
  ): Promise<PageContext | null>

  /**
   * Get project context
   * @param projectId - The project ID
   * @param workspaceId - The workspace ID for scoping
   * @param options - Optional context retrieval options
   * @returns Project context with epics, tasks, and related info, or null if not found
   */
  getProjectContext(
    projectId: string,
    workspaceId: string,
    options?: ContextOptions
  ): Promise<ProjectContext | null>

  /**
   * Get task context
   * @param taskId - The task ID
   * @param workspaceId - The workspace ID for scoping
   * @param options - Optional context retrieval options
   * @returns Task context with relationships and dependencies, or null if not found
   */
  getTaskContext(
    taskId: string,
    workspaceId: string,
    options?: ContextOptions
  ): Promise<TaskContext | null>

  /**
   * Get organization context
   * @param workspaceId - The workspace ID
   * @param options - Optional context retrieval options
   * @returns Organization context with teams, roles, hierarchy, or null if not found
   */
  getOrgContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<OrgContext | null>

  /**
   * Get activity/recent changes context
   * @param workspaceId - The workspace ID
   * @param options - Optional context retrieval options
   * @returns Activity context with recent decisions and changes, or null if not found
   */
  getActivityContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<ActivityContext | null>

  /**
   * Get unified context combining multiple context types
   * @param params - Unified context parameters
   * @returns Unified context with all relevant information, or null if workspace not found
   */
  getUnifiedContext(params: {
    workspaceId: string
    projectId?: string
    pageId?: string
    taskId?: string
    userId?: string
    options?: ContextOptions
  }): Promise<UnifiedContext | null>
}

/**
 * Prisma-backed Context Engine Implementation
 * 
 * Fetches data from Prisma domain models and maps to canonical ContextObject types.
 * Automatically saves to Context Store for future indexing and caching.
 */
export class PrismaContextEngine implements ContextEngine {
  /**
   * Get workspace-level context
   */
  async getWorkspaceContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<WorkspaceContext | null> {
    try {
      // Fetch workspace with counts
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              projects: true,
              wikiPages: true
            }
          }
        }
      })

      if (!workspace) {
        return null
      }

      // Map to WorkspaceContext
      const context: WorkspaceContext = {
        type: ContextType.WORKSPACE,
        id: workspace.id,
        workspaceId: workspace.id,
        timestamp: new Date().toISOString(),
        name: workspace.name,
        description: workspace.description || undefined,
        purpose: undefined, // Not in schema yet
        memberCount: workspace._count.members,
        projectCount: workspace._count.projects,
        pageCount: workspace._count.wikiPages,
        recentActivity: undefined // Will be populated if needed
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save workspace context to store', { workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching workspace context', { workspaceId, error })
      return null
    }
  }

  /**
   * Get page (wiki) context
   */
  async getPageContext(
    pageId: string,
    workspaceId: string,
    options?: ContextOptions
  ): Promise<PageContext | null> {
    try {
      // Fetch page with relations
      const page = await prisma.wikiPage.findFirst({
        where: {
          id: pageId,
          workspaceId // Enforce workspace scoping
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          parent: {
            select: {
              id: true,
              title: true,
              slug: true,
              parentId: true
            }
          }
        }
      })

      if (!page) {
        return null
      }

      // Build breadcrumbs from parent chain
      const breadcrumbs = await this.buildBreadcrumbs(page.id, workspaceId)

      // Find related docs (by tags or category, limit to 5)
      const relatedDocs = await this.findRelatedDocs(page, workspaceId, options?.limit || 5)

      // Map to PageContext
      const context: PageContext = {
        type: ContextType.PAGE,
        id: page.id,
        workspaceId: page.workspaceId,
        timestamp: new Date().toISOString(),
        title: page.title,
        slug: page.slug,
        content: page.content || undefined,
        excerpt: page.excerpt || undefined,
        isEmpty: !page.content || page.content.trim().length === 0,
        selectedText: undefined, // Will be provided by caller if needed
        breadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : undefined,
        category: page.category || undefined,
        tags: page.tags.length > 0 ? page.tags : undefined,
        relatedDocs: relatedDocs.length > 0 ? relatedDocs : undefined,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
        viewCount: page.view_count || undefined,
        author: page.createdBy ? {
          id: page.createdBy.id,
          name: page.createdBy.name || 'Unknown',
          email: page.createdBy.email || undefined
        } : undefined
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save page context to store', { pageId, workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching page context', { pageId, workspaceId, error })
      return null
    }
  }

  /**
   * Get project context
   */
  async getProjectContext(
    projectId: string,
    workspaceId: string,
    options?: ContextOptions
  ): Promise<ProjectContext | null> {
    try {
      // Fetch project with epics and tasks
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId // Enforce workspace scoping
        },
        include: {
          epics: {
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              _count: {
                select: {
                  tasks: true
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            take: options?.limit || 20,
            orderBy: {
              updatedAt: 'desc'
            }
          }
        }
      })

      if (!project) {
        return null
      }

      // Map epics to EpicSummary
      const epics: EpicSummary[] = project.epics.map(epic => ({
        id: epic.id,
        name: epic.title,
        description: epic.description || undefined,
        status: undefined, // Not in schema
        taskCount: epic._count.tasks
      }))

      // Map tasks to TaskSummary
      const tasks: TaskSummary[] = project.tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() || undefined,
        assignee: task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.name || 'Unknown',
          email: task.assignee.email || undefined
        } : undefined
      }))

      // Map to ProjectContext
      const context: ProjectContext = {
        type: ContextType.PROJECT,
        id: project.id,
        workspaceId: project.workspaceId,
        timestamp: new Date().toISOString(),
        name: project.name,
        description: project.description || undefined,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate?.toISOString() || undefined,
        endDate: project.endDate?.toISOString() || undefined,
        department: project.department || undefined,
        team: project.team || undefined,
        epics: epics.length > 0 ? epics : undefined,
        tasks: tasks.length > 0 ? tasks : undefined,
        recentActivity: undefined // Will be populated if needed
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save project context to store', { projectId, workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching project context', { projectId, workspaceId, error })
      return null
    }
  }

  /**
   * Get task context
   */
  async getTaskContext(
    taskId: string,
    workspaceId: string,
    options?: ContextOptions
  ): Promise<TaskContext | null> {
    try {
      // Fetch task with relations
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          workspaceId // Enforce workspace scoping
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          },
          epic: {
            select: {
              id: true,
              title: true
            }
          }
        }
      })

      if (!task) {
        return null
      }

      // Fetch related tasks (tasks in same project, limit to 5)
      const relatedTasks = await prisma.task.findMany({
        where: {
          projectId: task.projectId,
          workspaceId,
          id: { not: task.id }
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        take: 5,
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // Map to TaskContext
      const context: TaskContext = {
        type: ContextType.TASK,
        id: task.id,
        workspaceId: task.workspaceId,
        timestamp: new Date().toISOString(),
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() || undefined,
        assignee: task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.name || 'Unknown',
          email: task.assignee.email || undefined
        } : undefined,
        project: task.project ? {
          id: task.project.id,
          name: task.project.name
        } : undefined,
        epic: task.epic ? {
          id: task.epic.id,
          name: task.epic.title
        } : undefined,
        dependencies: task.dependsOn.length > 0 ? task.dependsOn : undefined,
        relatedTasks: relatedTasks.length > 0 ? relatedTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() || undefined,
          assignee: t.assignee ? {
            id: t.assignee.id,
            name: t.assignee.name || 'Unknown',
            email: t.assignee.email || undefined
          } : undefined
        })) : undefined
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save task context to store', { taskId, workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching task context', { taskId, workspaceId, error })
      return null
    }
  }

  /**
   * Get organization context
   * v1: Simple implementation with OrgPosition[] + teams, no deep joins
   */
  async getOrgContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<OrgContext | null> {
    try {
      // Fetch org positions with teams (simple, no deep joins)
      const positions = await prisma.orgPosition.findMany({
        where: {
          workspaceId,
          isActive: true
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              department: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          parent: {
            select: {
              id: true,
              title: true
            }
          }
        },
        take: options?.limit || 100
      })

      if (positions.length === 0) {
        // Return empty context rather than null
        const context: OrgContext = {
          type: ContextType.ORG,
          id: workspaceId,
          workspaceId,
          timestamp: new Date().toISOString(),
          teams: [],
          roles: [],
          departments: [],
          hierarchy: undefined,
          recentChanges: undefined
        }

        try {
          await saveContextItem(context)
        } catch (error) {
          logger.error('Failed to save org context to store', { workspaceId, error })
        }

        return context
      }

      // Build teams, roles, departments from positions
      const teamsMap = new Map<string, TeamSummary>()
      const departmentsMap = new Map<string, DepartmentSummary>()
      const roles: RoleSummary[] = []

      for (const position of positions) {
        // Build role summary
        roles.push({
          id: position.id,
          title: position.title,
          teamId: position.teamId || undefined,
          teamName: position.team?.name || undefined,
          department: position.team?.department?.name || undefined,
          level: position.level,
          userId: position.userId || undefined,
          userName: position.user?.name || undefined,
          parentId: position.parentId || undefined
        })

        // Build team summary
        if (position.team) {
          if (!teamsMap.has(position.team.id)) {
            teamsMap.set(position.team.id, {
              id: position.team.id,
              name: position.team.name,
              department: position.team.department?.name || undefined,
              memberCount: undefined // Will calculate if needed
            })
          }
        }

        // Build department summary
        if (position.team?.department) {
          if (!departmentsMap.has(position.team.department.id)) {
            departmentsMap.set(position.team.department.id, {
              id: position.team.department.id,
              name: position.team.department.name,
              teamCount: undefined // Will calculate if needed
            })
          }
        }
      }

      // Build hierarchy (simple tree structure)
      const hierarchy = this.buildOrgHierarchy(positions)

      // Map to OrgContext
      const context: OrgContext = {
        type: ContextType.ORG,
        id: workspaceId,
        workspaceId,
        timestamp: new Date().toISOString(),
        teams: Array.from(teamsMap.values()),
        roles: roles.length > 0 ? roles : undefined,
        departments: Array.from(departmentsMap.values()),
        hierarchy: hierarchy.length > 0 ? hierarchy : undefined,
        recentChanges: undefined // Will be populated if needed
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save org context to store', { workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching org context', { workspaceId, error })
      return null
    }
  }

  /**
   * Get activity/recent changes context
   * v1: Last N activities for the workspace
   * 
   * Note: Activity model doesn't have workspaceId, so we fetch recent activities
   * and filter by checking if the entity belongs to the workspace.
   * This is a limitation that should be fixed in the schema.
   */
  async getActivityContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<ActivityContext | null> {
    try {
      // Fetch recent activities (limit to 100, we'll filter by workspace after)
      const activities = await prisma.activity.findMany({
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        take: 100, // Fetch more to filter by workspace
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Filter by workspace by checking entity workspaceId
      // This is a workaround - Activity should have workspaceId in future
      const workspaceActivityIds = new Set<string>()
      
      // Check projects
      const projectIds = await prisma.project.findMany({
        where: { workspaceId },
        select: { id: true }
      })
      projectIds.forEach(p => workspaceActivityIds.add(p.id))

      // Check tasks
      const taskIds = await prisma.task.findMany({
        where: { workspaceId },
        select: { id: true }
      })
      taskIds.forEach(t => workspaceActivityIds.add(t.id))

      // Check wiki pages
      const pageIds = await prisma.wikiPage.findMany({
        where: { workspaceId },
        select: { id: true }
      })
      pageIds.forEach(p => workspaceActivityIds.add(p.id))

      // Filter activities that belong to this workspace
      const workspaceActivities = activities
        .filter(activity => {
          // Check if entityId matches any workspace entity
          return workspaceActivityIds.has(activity.entityId)
        })
        .slice(0, options?.limit || 50) // Apply limit after filtering

      // Map to ActivitySummary
      const activitySummaries: ActivitySummary[] = workspaceActivities.map(activity => ({
        id: activity.id,
        entity: activity.entity,
        entityId: activity.entityId,
        action: activity.action,
        userId: activity.actorId,
        userName: activity.actor.name || 'Unknown',
        timestamp: activity.createdAt.toISOString(),
        description: undefined, // Not in schema
        metadata: activity.meta as Record<string, unknown> | undefined
      }))

      // Map to ActivityContext
      const context: ActivityContext = {
        type: ContextType.ACTIVITY,
        id: workspaceId,
        workspaceId,
        timestamp: new Date().toISOString(),
        activities: activitySummaries,
        timeRange: options?.filters?.dateRange || undefined,
        filters: options?.filters ? {
          entityTypes: options.filters.entityTypes,
          actions: options.filters.actions,
          userIds: options.filters.userIds
        } : undefined
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save activity context to store', { workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching activity context', { workspaceId, error })
      return null
    }
  }

  /**
   * Get unified context combining multiple context types
   * v1: Simple - workspace + one primary anchor (projectId, pageId, or taskId)
   */
  async getUnifiedContext(params: {
    workspaceId: string
    projectId?: string
    pageId?: string
    taskId?: string
    userId?: string
    options?: ContextOptions
  }): Promise<UnifiedContext | null> {
    try {
      const { workspaceId, projectId, pageId, taskId, options } = params

      // Always fetch workspace context
      const workspace = await this.getWorkspaceContext(workspaceId, options)
      if (!workspace) {
        return null
      }

      // Fetch primary anchor context (only one at a time in v1)
      let activePage: PageContext | undefined
      let activeProject: ProjectContext | undefined
      let activeTask: TaskContext | undefined

      if (pageId) {
        activePage = await this.getPageContext(pageId, workspaceId, options) || undefined
      } else if (projectId) {
        activeProject = await this.getProjectContext(projectId, workspaceId, options) || undefined
      } else if (taskId) {
        activeTask = await this.getTaskContext(taskId, workspaceId, options) || undefined
        // If task has project, also fetch project context
        if (activeTask?.project?.id) {
          activeProject = await this.getProjectContext(activeTask.project.id, workspaceId, options) || undefined
        }
      }

      // Build unified context
      const context: UnifiedContext = {
        type: ContextType.UNIFIED,
        id: workspaceId,
        workspaceId,
        timestamp: new Date().toISOString(),
        workspace,
        activePage,
        activeProject,
        activeTask,
        org: undefined, // Will be populated if needed
        recentActivity: undefined, // Will be populated if needed
        relatedDocs: activePage?.relatedDocs,
        projects: undefined, // Will be populated if needed
        tasks: undefined // Will be populated if needed
      }

      // Save to Context Store (log errors but don't fail)
      try {
        await saveContextItem(context)
      } catch (error) {
        logger.error('Failed to save unified context to store', { workspaceId, error })
      }

      return context
    } catch (error) {
      logger.error('Error fetching unified context', { params, error })
      return null
    }
  }

  /**
   * Helper: Build breadcrumbs from page parent chain
   */
  private async buildBreadcrumbs(
    pageId: string,
    workspaceId: string
  ): Promise<Breadcrumb[]> {
    const breadcrumbs: Breadcrumb[] = []
    let currentPageId: string | null = pageId
    let level = 0

    // Traverse up the parent chain
    while (currentPageId && level < 10) { // Limit depth to prevent infinite loops
      const page = await prisma.wikiPage.findUnique({
        where: { id: currentPageId },
        select: {
          id: true,
          title: true,
          slug: true,
          parentId: true
        }
      })

      if (!page) {
        break
      }

      breadcrumbs.unshift({
        id: page.id,
        title: page.title,
        slug: page.slug,
        level
      })

      currentPageId = page.parentId
      level++
    }

    return breadcrumbs
  }

  /**
   * Helper: Find related docs by tags or category
   */
  private async findRelatedDocs(
    page: { id: string; tags: string[]; category: string; workspaceId: string },
    workspaceId: string,
    limit: number = 5
  ): Promise<RelatedDoc[]> {
    if (page.tags.length === 0 && !page.category) {
      return []
    }

    // Find pages with overlapping tags or same category
    const related = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        id: { not: page.id },
        isPublished: true,
        OR: [
          ...(page.tags.length > 0 ? [{ tags: { hasSome: page.tags } }] : []),
          ...(page.category ? [{ category: page.category }] : [])
        ]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        tags: true
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return related.map(doc => ({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      excerpt: doc.excerpt || undefined,
      snippet: doc.excerpt || undefined,
      relevanceScore: undefined, // Will be calculated with embeddings later
      category: doc.category || undefined,
      tags: doc.tags.length > 0 ? doc.tags : undefined
    }))
  }

  /**
   * Helper: Build org hierarchy tree
   */
  private buildOrgHierarchy(
    positions: Array<{
      id: string
      title: string
      level: number
      parentId: string | null
      userId: string | null
      teamId: string | null
    }>
  ): OrgHierarchyNode[] {
    // Build map of nodes
    const nodeMap = new Map<string, OrgHierarchyNode>()
    const rootNodes: OrgHierarchyNode[] = []

    // Create nodes
    for (const position of positions) {
      const node: OrgHierarchyNode = {
        id: position.id,
        title: position.title,
        level: position.level,
        children: [],
        userId: position.userId || undefined,
        teamId: position.teamId || undefined
      }
      nodeMap.set(position.id, node)
    }

    // Build tree structure
    for (const position of positions) {
      const node = nodeMap.get(position.id)!
      if (position.parentId) {
        const parent = nodeMap.get(position.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        } else {
          // Parent not in current set, treat as root
          rootNodes.push(node)
        }
      } else {
        rootNodes.push(node)
      }
    }

    return rootNodes
  }
}

/**
 * Default context engine instance
 */
export const contextEngine: ContextEngine = new PrismaContextEngine()

/**
 * Get workspace ContextObjects (unified format)
 * 
 * Fetches projects (and optionally tasks) for a workspace and converts them
 * to unified ContextObjects using the context builders.
 * 
 * @param params - Parameters for fetching ContextObjects
 * @returns Array of ContextObjects (projects first, then tasks if included)
 */
export async function getWorkspaceContextObjects(params: {
  workspaceId: string
  userId: string
  includeTasks?: boolean
  limit?: number
}): Promise<UnifiedContextObject[]> {
  try {
    const { workspaceId, userId, includeTasks = false, limit = 50 } = params

    // Fetch active projects (exclude archived unless specifically requested)
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        isArchived: false // Only active projects by default
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Convert projects to ContextObjects
    const projectContextObjects = projects.map(project => {
      return projectToContext(project, {
        owner: project.owner || null,
        team: null // Team is stored as string, not a relation
      })
    })

    // Optionally include tasks
    if (includeTasks && projects.length > 0) {
      const projectIds = projects.map(p => p.id)
      const tasks = await prisma.task.findMany({
        where: {
          workspaceId,
          projectId: { in: projectIds }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        take: limit,
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // Convert tasks to ContextObjects
      const taskContextObjects = tasks.map(task => {
        return taskToContext(task, {
          project: task.project || null,
          assignee: task.assignee || null
        })
      })

      // Return projects first, then tasks
      return [...projectContextObjects, ...taskContextObjects]
    }

    return projectContextObjects
  } catch (error) {
    logger.error('Error fetching workspace ContextObjects', {
      workspaceId: params.workspaceId,
      error
    })
    // Return empty array on error to avoid breaking the flow
    return []
  }
}

/**
 * Get personal space documents (wiki pages) for a user
 * 
 * Fetches wiki pages that belong to the user's personal space and converts them
 * to unified ContextObjects using the context builders.
 * 
 * @param params - Parameters for fetching personal space docs
 * @returns Array of ContextObjects representing personal space pages
 */
export async function getPersonalSpaceDocs(params: {
  workspaceId: string
  userId: string
  limit?: number
}): Promise<UnifiedContextObject[]> {
  try {
    const { workspaceId, userId, limit = 50 } = params

    // Fetch personal space pages using the same pattern as page-counts route
    // Personal space pages are identified by:
    // - workspace_type = 'personal' OR
    // - Legacy: workspace_type is null/empty AND permissionLevel = 'personal'
    // Also filter by createdById to ensure they're the user's personal pages
    const pages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        createdById: userId, // Only pages created by this user
        isPublished: true, // Only published pages
        OR: [
          { workspace_type: 'personal' },
          {
            AND: [
              {
                OR: [
                  { workspace_type: null },
                  { workspace_type: '' }
                ]
              },
              { permissionLevel: 'personal' }
            ]
          }
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true
          },
          take: 1 // Only need first project for relation
        }
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Convert pages to ContextObjects
    // Note: We don't include project relation for personal space pages
    // since they're typically not linked to projects
    const pageContextObjects = pages.map(page => {
      return pageToContext(page, {
        owner: page.createdBy || null,
        project: null // Personal space pages typically aren't linked to projects
      })
    })

    return pageContextObjects
  } catch (error) {
    logger.error('Error fetching personal space docs', {
      workspaceId: params.workspaceId,
      userId: params.userId,
      error
    })
    // Return empty array on error to avoid breaking the flow
    return []
  }
}

/**
 * Get organization people (users with their roles/positions) as ContextObjects
 * 
 * Fetches OrgPosition records that are occupied (have a userId) and converts them
 * to unified ContextObjects using the context builders. This provides a list of
 * people in the organization with their roles, teams, and departments.
 * 
 * @param params - Parameters for fetching org people
 * @returns Array of ContextObjects representing people with their roles
 */
export async function getOrgPeopleContext(params: {
  workspaceId: string
  limit?: number
}): Promise<UnifiedContextObject[]> {
  try {
    const { workspaceId, limit = 100 } = params

    // Fetch org positions that are occupied (have a userId) and are active
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null } // Only positions that are occupied by users
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc' // Sort by most recently updated
      }
    })

    // Convert positions to ContextObjects using roleToContext
    const peopleContextObjects = positions.map(position => {
      return roleToContext(position, {
        person: position.user || null,
        team: position.team || null
      })
    })

    return peopleContextObjects
  } catch (error) {
    logger.error('Error fetching org people context', {
      workspaceId: params.workspaceId,
      error
    })
    // Return empty array on error to avoid breaking the flow
    return []
  }
}
