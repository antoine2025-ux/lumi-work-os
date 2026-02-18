import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
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
import {
  createProjectAllocation,
  canTakeOnWork,
} from '@/lib/org/capacity/project-capacity'
// Phase 5: Org sync event - no-op for now (pm/events is Socket.IO only)

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
  const startTime = performance.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  logger.info('Incoming request /api/projects', baseContext)
  
  try {
    // 1. Get authenticated user with workspace context
    const authStart = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStart
    
    // 2. Assert workspace access (VIEWER can see projects)
    const accessStart = performance.now()
    try {
      await assertAccess({ 
        userId: auth.user.userId, 
        workspaceId: auth.workspaceId, 
        scope: 'workspace', 
        requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
      })
    } catch (accessError: any) {
      const accessDurationMs = performance.now() - accessStart
      console.error('[PROJECTS API] Access check failed:', {
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        error: accessError.message,
        stack: accessError.stack
      })
      
      // Check workspace membership directly for debugging
      // Exclude employmentStatus field that may not exist in database yet
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: auth.workspaceId,
            userId: auth.user.userId
          }
        },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
          // Exclude employmentStatus - may not exist in database yet
        }
      })
      throw accessError
    }
    const accessDurationMs = performance.now() - accessStart

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
        return projectToContext(project as any, {
          owner: project.owner as any || null,
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
      const totalDurationMs = performance.now() - startTime
      logger.info('Projects fetch completed (cached)', {
        ...baseContext,
        projectCount: cachedProjects.length,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        totalDurationMs: Math.round(totalDurationMs * 100) / 100,
        cacheHit: true,
      })
      
      return response
    }

    // Build where clause - workspace scoped
    // NOTE: ProjectSpace visibility filtering removed - projectSpaceId field does not exist on Project model
    const where: any = { workspaceId: auth.workspaceId } // 5. Use activeWorkspaceId, no hardcoded values
    if (status) {
      where.status = status
    }

    // Optimized query: Use select instead of include, limit tasks loaded
    const dbStart = performance.now()
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
        // NOTE: projectSpaceId and projectSpace removed - fields do not exist on Project model
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
    const dbDurationMs = performance.now() - dbStart

    // Build ContextObjects for each project
    const contextObjects = projects.map(project => {
      return projectToContext(project as any, {
        owner: project.owner as any || null,
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
    const totalDurationMs = performance.now() - startTime
    logger.info('Projects fetch completed', {
      ...baseContext,
      projectCount: projects.length,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      accessDurationMs: Math.round(accessDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100,
      cacheHit: false,
    })

    // Log slow requests
    if (totalDurationMs > 500) {
      logger.warn('Slow request /api/projects', {
        ...baseContext,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        accessDurationMs: Math.round(accessDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100,
        totalDurationMs: Math.round(totalDurationMs * 100) / 100,
      })
    }
    
    return response
  } catch (error: any) {
    const totalDurationMs = performance.now() - startTime
    logger.error('Error in /api/projects', {
      ...baseContext,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    }, error)
    
    return handleApiError(error, request)
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
      teamId,
      ownerId,
      assigneeIds = [],
      wikiPageId,
      dailySummaryEnabled = false,
      visibility,
      memberUserIds = []
    } = validatedData

    // Extract watcher IDs from the request body
    const { watcherIds = [] } = body

    // Handle empty strings as null/undefined
    const cleanData = {
      ...validatedData,
      department: department || undefined,
      team: team || undefined,
      teamId: teamId ?? undefined,
      ownerId: ownerId || undefined,
      wikiPageId: wikiPageId || undefined
    }

    // NOTE: spaceId logic removed - Space model and spaceId field do not exist on Project model

    const effectiveOwnerId = cleanData.ownerId || auth.user.userId

    // Collect all member IDs (owner + assignees, deduplicated)
    const allMemberIds = Array.from(
      new Set([effectiveOwnerId, ...assigneeIds].filter(Boolean))
    ) as string[]

    // Lookup org positions for all members (batch before transaction)
    const orgPositionByUserId = new Map<string, { id: string } | null>()
    for (const userId of allMemberIds) {
      const pos = await prisma.orgPosition.findFirst({
        where: { userId, workspaceId: auth.workspaceId },
        select: { id: true },
      })
      orgPositionByUserId.set(userId, pos)
    }

    // Create the project and all ProjectMembers atomically
    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await (tx.project.create as Function)({
        data: {
          workspaceId: auth.workspaceId,
          name,
          description,
          status: status as any,
          priority: priority as any,
          startDate: cleanData.startDate ? new Date(cleanData.startDate) : null,
          endDate: cleanData.endDate ? new Date(cleanData.endDate) : null,
          color,
          department: cleanData.department,
          team: cleanData.team,
          teamId: cleanData.teamId ?? null,
          ownerId: effectiveOwnerId,
          wikiPageId: cleanData.wikiPageId,
          dailySummaryEnabled,
          createdById: auth.user.userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      })

      // Create ProjectMember for each (owner + assignees) with orgPositionId
      for (const userId of allMemberIds) {
        const role = userId === effectiveOwnerId ? 'OWNER' : 'MEMBER'
        const orgPositionId = orgPositionByUserId.get(userId)?.id ?? null

        await tx.projectMember.create({
          data: {
            projectId: createdProject.id,
            userId,
            orgPositionId,
            role,
            workspaceId: auth.workspaceId,
          },
        })

        // Auto-create ProjectPersonLink for Loopbrain
        const linkRole = role === 'OWNER' ? 'OWNER' : 'CONTRIBUTOR'
        await (tx.projectPersonLink as any).create({
          data: {
            projectId: createdProject.id,
            userId,
            orgPositionId,
            role: linkRole,
            workspaceId: auth.workspaceId,
          },
        })
      }

      // Reload project with all members
      const projectWithMembers = await tx.project.findUnique({
        where: { id: createdProject.id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      })

      return projectWithMembers || createdProject
    })

    // Create WorkAllocations for all members with org positions
    const ownerHours = 15
    const memberHours = 10
    for (const userId of allMemberIds) {
      const orgPosition = orgPositionByUserId.get(userId)
      if (!orgPosition) {
        logger.warn('[Project Create] User has no OrgPosition, skipping WorkAllocation', {
          userId,
          workspaceId: auth.workspaceId,
        })
        continue
      }
      const hours = userId === effectiveOwnerId ? ownerHours : memberHours
      const roleLabel = userId === effectiveOwnerId ? 'Owner' : 'Member'

      await createProjectAllocation({
        workspaceId: auth.workspaceId,
        orgPositionId: orgPosition.id,
        projectId: project.id,
        hoursAllocated: hours,
        description: `${roleLabel} of ${project.name}`,
      }).catch((err) => {
        logger.warn('[Project Create] Could not create WorkAllocation', {
          userId,
          projectId: project.id,
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }

    // Create watchers
    if (watcherIds && watcherIds.length > 0) {
      await prisma.projectWatcher.createMany({
        data: watcherIds.map((watcherUserId: string) => ({
          projectId: project.id,
          userId: watcherUserId,
          workspaceId: auth.workspaceId,
        })),
      })
    }

    // Upsert project context in Loopbrain (fire-and-forget, don't block response)
    upsertProjectContext(project.id).catch((error) => {
      console.error('Failed to upsert project context after creation', { projectId: project.id, error })
    })

    // Build warnings for members without org positions
    const membersWithoutOrg = allMemberIds.filter((id) => !orgPositionByUserId.get(id))
    const warnings =
      membersWithoutOrg.length > 0
        ? `${membersWithoutOrg.length} member(s) do not have org positions and won't have capacity tracking`
        : undefined

    return NextResponse.json({
      ...project,
      id: project.id,
      membersCreated: allMemberIds.length,
      warnings,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
