import { NextRequest, NextResponse } from 'next/server'
import { ProjectCreateSchema } from '@/lib/pm/schemas'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { upsertProjectContext } from '@/lib/loopbrain/context-engine'
import { projectToContext } from '@/lib/context/context-builders'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

/**
 * GET /api/projects - Get all projects for a workspace
 * 
 * Response shape:
 * {
 *   projects: Project[]        // Array of project objects (original format)
 *   contextObjects: ContextObject[]  // Array of unified ContextObjects for each project
 * }
 * 
 * Note: The response is an object (not a direct array) to support both the original
 * project data and the new ContextObject format. Consumers should read from `response.projects`.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  logger.info('Incoming request /api/projects', baseContext)
  
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    console.log('[PROJECTS API] Auth context:', {
      userId: auth.user.userId,
      userEmail: auth.user.email,
      workspaceId: auth.workspaceId
    })
    
    // 2. Assert workspace access (VIEWER can see projects)
    try {
      await assertAccess({ 
        userId: auth.user.userId, 
        workspaceId: auth.workspaceId, 
        scope: 'workspace', 
        requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
      })
    } catch (accessError: any) {
      console.error('[PROJECTS API] Access check failed:', {
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        error: accessError.message,
        stack: accessError.stack
      })
      
      // Check workspace membership directly for debugging
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: auth.workspaceId,
            userId: auth.user.userId
          }
        }
      })
      console.log('[PROJECTS API] WorkspaceMember check:', workspaceMember ? {
        found: true,
        role: workspaceMember.role
      } : { found: false })
      
      throw accessError
    }

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Generate cache key
    const cacheKey = cache.generateKey(
      CACHE_KEYS.PROJECTS,
      auth.workspaceId,
      status || 'all'
    )

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      // Build ContextObjects for cached projects
      const cachedProjects = cached as typeof projects
      const cachedContextObjects = cachedProjects.map(project => {
        return projectToContext(project, {
          owner: project.owner || null,
          team: null
        })
      })
      const cachedResponseData = {
        projects: cachedProjects,
        contextObjects: cachedContextObjects
      }
      const response = NextResponse.json(cachedResponseData)
      response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
      response.headers.set('X-Cache', 'HIT')
      
      // Log completion (cached)
      const durationMs = Date.now() - startTime
      logger.info('Projects fetch completed (cached)', {
        ...baseContext,
        projectCount: cachedProjects.length,
        durationMs,
        cacheHit: true,
      })
      
      return response
    }

    // Build where clause with ProjectSpace visibility filtering
    const where: any = { workspaceId: auth.workspaceId } // 5. Use activeWorkspaceId, no hardcoded values
    if (status) {
      where.status = status
    }

    // NEW: Filter by ProjectSpace visibility
    // PUBLIC spaces: visible to all workspace members
    // TARGETED spaces: only visible to ProjectSpaceMembers
    where.OR = [
      // Projects without a ProjectSpace (legacy, treat as PUBLIC)
      { projectSpaceId: null },
      // Projects in PUBLIC spaces
      {
        projectSpace: {
          visibility: 'PUBLIC'
        }
      },
      // Projects in TARGETED spaces where user is a member
      {
        projectSpace: {
          visibility: 'TARGETED',
          members: {
            some: {
              userId: auth.user.userId
            }
          }
        }
      },
      // Projects where user is creator/owner (always visible)
      { createdById: auth.user.userId },
      { ownerId: auth.user.userId }
    ]

    // Optimized query: Use select instead of include, limit tasks loaded
    console.log('[PROJECTS API] About to query Prisma with where:', JSON.stringify(where, null, 2))
    console.log('[PROJECTS API] User ID:', auth.user.userId, 'Workspace ID:', auth.workspaceId)
    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        color: true,
        department: true,
        team: true,
        ownerId: true,
        isArchived: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        projectSpaceId: true,
        projectSpace: {
          select: {
            id: true,
            name: true,
            visibility: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // Limit members to reduce payload size
        members: {
          take: 10, // Only load first 10 members
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        // Limit tasks - only load recent/summary data
        tasks: {
          take: 5, // Only load 5 most recent tasks
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('[PROJECTS API] Found projects:', projects.length)
    if (projects.length === 0) {
      // Debug: Check if there are any projects in the workspace at all
      const allProjectsInWorkspace = await prisma.project.findMany({
        where: { workspaceId: auth.workspaceId },
        select: { id: true, name: true, projectSpaceId: true },
        take: 5
      })
      console.log('[PROJECTS API] Debug - Total projects in workspace:', allProjectsInWorkspace.length)
      console.log('[PROJECTS API] Sample projects:', allProjectsInWorkspace.map(p => ({
        id: p.id,
        name: p.name,
        projectSpaceId: p.projectSpaceId
      })))
      
      // Check workspace membership
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: auth.workspaceId,
            userId: auth.user.userId
          }
        }
      })
      console.log('[PROJECTS API] User workspace membership:', workspaceMember ? 'YES' : 'NO')
      
      console.log('[PROJECTS API] No projects found. Query details:', {
        workspaceId: auth.workspaceId,
        userId: auth.user.userId,
        whereClause: JSON.stringify(where, null, 2)
      })
    }

    // Build ContextObjects for each project
    const contextObjects = projects.map(project => {
      return projectToContext(project, {
        owner: project.owner || null,
        team: null // Team is stored as string in Project model, not a relation
      })
    })

    // Prepare response: return object with projects array and contextObjects array
    // Note: This changes the response shape from array to object, but maintains
    // all original project data in the 'projects' field for backward compatibility
    const responseData = {
      projects,
      contextObjects
    }

    // Cache the result for 5 minutes (cache original projects only to maintain compatibility)
    await cache.set(cacheKey, projects, CACHE_TTL.SHORT)

    // Add HTTP caching headers for better performance
    const response = NextResponse.json(responseData)
    response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
    response.headers.set('X-Cache', 'MISS')
    
    // Log completion
    const durationMs = Date.now() - startTime
    logger.info('Projects fetch completed', {
      ...baseContext,
      projectCount: projects.length,
      durationMs,
      cacheHit: false,
    })

    // Log slow requests
    if (durationMs > 500) {
      logger.warn('Slow request /api/projects', {
        ...baseContext,
        durationMs,
      })
    }
    
    return response
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    logger.error('Error in /api/projects', {
      ...baseContext,
      durationMs,
    }, error)
    
    // Handle auth errors
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Return detailed error in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { 
          message: error?.message, 
          code: error?.code, 
          name: error?.name,
          stack: error?.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
        }
      : {}
    
    return NextResponse.json({ 
      error: 'Failed to fetch projects',
      ...errorDetails
    }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access (require MEMBER or higher to create projects)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] // Allow MEMBERs to create projects
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    
    // Validate request body with Zod
    const validatedData = ProjectCreateSchema.parse(body)
    const { 
      name, 
      description, 
      status = 'ACTIVE',
      priority = 'MEDIUM',
      startDate,
      endDate,
      color,
      department,
      team,
      ownerId,
      wikiPageId,
      dailySummaryEnabled = false,
      visibility,
      memberUserIds = []
    } = validatedData

    // Extract watcher, assignee IDs, and legacy projectSpaceId from the request body
    const { watcherIds = [], assigneeIds = [], projectSpaceId: legacyProjectSpaceId } = body

    // Determine projectSpaceId based on visibility
    let projectSpaceId: string | undefined
    
    if (legacyProjectSpaceId) {
      // Legacy support: validate projectSpaceId belongs to workspace if provided
      const space = await prisma.projectSpace.findUnique({
        where: { id: legacyProjectSpaceId },
        select: { workspaceId: true }
      })
      
      if (!space || space.workspaceId !== auth.workspaceId) {
        return NextResponse.json({ 
          error: 'Invalid project space or space does not belong to this workspace' 
        }, { status: 400 })
      }
      projectSpaceId = legacyProjectSpaceId
    } else if (visibility === 'TARGETED') {
      // New flow: create private ProjectSpace
      const { createPrivateProjectSpace } = await import('@/lib/pm/project-space-helpers')
      projectSpaceId = await createPrivateProjectSpace(
        auth.workspaceId,
        name,
        auth.user.userId,
        memberUserIds
      )
    } else {
      // Default: PUBLIC - use General space
      const { getOrCreateGeneralProjectSpace } = await import('@/lib/pm/project-space-helpers')
      projectSpaceId = await getOrCreateGeneralProjectSpace(auth.workspaceId)
      // If migration not run, projectSpaceId will be null - that's OK, project will work without it (legacy mode)
    }

    // Handle empty strings as null/undefined
    const cleanData = {
      ...validatedData,
      department: department || undefined,
      team: team || undefined,
      ownerId: ownerId || undefined,
      wikiPageId: wikiPageId || undefined,
      projectSpaceId: projectSpaceId // Now determined by visibility logic above
    }

    // Create the project and creator's membership atomically in a transaction
    // This guarantees immediate access for the creator and avoids race conditions with assertProjectAccess
    const project = await prisma.$transaction(async (tx) => {
      // Create the project
      const createdProject = await tx.project.create({
        data: {
          workspaceId: auth.workspaceId, // 5. Use activeWorkspaceId
          name,
          description,
          status: status as any,
          priority: priority as any,
          startDate: cleanData.startDate ? new Date(cleanData.startDate) : null,
          endDate: cleanData.endDate ? new Date(cleanData.endDate) : null,
          color,
          department: cleanData.department,
          team: cleanData.team,
          ownerId: cleanData.ownerId || auth.user.userId, // Use provided owner or default to creator
          wikiPageId: cleanData.wikiPageId,
          projectSpaceId: cleanData.projectSpaceId, // NEW: ProjectSpace assignment
          dailySummaryEnabled,
          createdById: auth.user.userId // 3. Use userId from auth
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      })

      // Add the creator as a project member with OWNER role
      // This is always created, even if no watchers/assignees/owner are passed
      await tx.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId: auth.user.userId, // 3. Use userId from auth
          role: 'OWNER'
        }
      })

      // Reload project to include the newly created member in the response
      const projectWithMember = await tx.project.findUnique({
        where: { id: createdProject.id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      })

      return projectWithMember || createdProject
    })

    // Create watchers
    if (watcherIds && watcherIds.length > 0) {
      await prisma.projectWatcher.createMany({
        data: watcherIds.map((watcherUserId: string) => ({
          projectId: project.id,
          userId: watcherUserId
        }))
      })
    }

    // Create assignees
    if (assigneeIds && assigneeIds.length > 0) {
      await prisma.projectAssignee.createMany({
        data: assigneeIds.map((assigneeUserId: string) => ({
          projectId: project.id,
          userId: assigneeUserId,
          role: 'MEMBER' // Default role for assignees
        }))
      })
    }

    // Upsert project context in Loopbrain (fire-and-forget, don't block response)
    upsertProjectContext(project.id).catch((error) => {
      console.error('Failed to upsert project context after creation', { projectId: project.id, error })
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error.message 
    }, { status: 500 })
  }
}
