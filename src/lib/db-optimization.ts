import { prisma } from './db'

/**
 * Optimized database queries with proper indexing and limits
 */

// Optimized task query with selective includes
export async function getTasksOptimized(workspaceId: string, options: {
  projectId?: string
  assigneeId?: string
  status?: string
  limit?: number
  offset?: number
} = {}) {
  const { projectId, assigneeId, status, limit = 50, offset = 0 } = options

  const where: any = { workspaceId }
  if (projectId) where.projectId = projectId
  if (assigneeId) where.assigneeId = assigneeId
  if (status) where.status = status

  return await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      // Only essential user data
      assignee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      // Only essential project data
      project: {
        select: {
          id: true,
          name: true,
          color: true
        }
      },
      // Count instead of loading all
      _count: {
        select: {
          subtasks: true,
          comments: true
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ],
    skip: offset,
    take: limit
  })
}

// Optimized AI context loading
export async function getAIContextOptimized(workspaceId: string) {
  // Use Promise.all for parallel queries
  const [wikiPages, projects, tasks] = await Promise.all([
    // Only essential wiki data
    prisma.wikiPage.findMany({
      where: {
        workspaceId,
        isPublished: true
      },
      select: {
        id: true,
        title: true,
        excerpt: true, // Use excerpt instead of full content
        slug: true,
        tags: true,
        category: true,
        updatedAt: true
      },
      take: 10, // Reduced from 15
      orderBy: { updatedAt: 'desc' }
    }),
    
    // Only essential project data
    prisma.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    }),
    
    // Only essential task data
    prisma.task.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    })
  ])

  return { wikiPages, projects, tasks }
}

// Optimized wiki search with better indexing
export async function searchWikiOptimized(
  workspaceId: string, 
  query: string, 
  options: {
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 20, offset = 0 } = options

  return await prisma.wikiPage.findMany({
    where: {
      workspaceId,
      isPublished: true,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          excerpt: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            hasSome: [query]
          }
        }
      ]
    },
    select: {
      id: true,
      title: true,
      excerpt: true,
      slug: true,
      tags: true,
      category: true,
      updatedAt: true,
      createdBy: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          comments: true,
          versions: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    skip: offset,
    take: limit
  })
}
