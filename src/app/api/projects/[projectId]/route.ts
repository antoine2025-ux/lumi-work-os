import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { ProjectUpdateSchema } from '@/lib/pm/schemas'
import { assertProjectAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { ProjectRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { upsertProjectContext } from '@/lib/loopbrain/context-engine'
import {
  createProjectAllocation,
  canTakeOnWork,
  closeIntegrationAllocations,
} from '@/lib/org/capacity/project-capacity'
import { logger } from '@/lib/logger'
import { syncProjectToGoals } from '@/lib/goals/project-sync'


// GET /api/projects/[projectId] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params
  const projectId = resolvedParams.projectId

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)

    // Phase A: Log database connection info when debugging (DEV ONLY)
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_DB === 'true') {
      try {
        const dbInfo = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`
        console.log(`[GET /api/projects/${projectId}] Database: ${dbInfo[0]?.current_database}`)
        console.log(`[GET /api/projects/${projectId}] DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@') || 'NOT SET'}`)
      } catch (e) {
        console.error(`[GET /api/projects/${projectId}] Could not query DB info:`, e)
      }
    }

    // Check project access
    // Convert UnifiedAuthUser to NextAuth User format
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    // CRITICAL: Pass workspaceId to ensure workspace isolation
    await assertProjectAccess(nextAuthUser, projectId, ProjectRole.VIEWER, auth.workspaceId)

    const project = await (prisma.project.findUnique as Function)({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        color: true,
        department: true,
        team: true,
        teamId: true,
        ownerId: true,
        isArchived: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        dailySummaryEnabled: true,
        wikiPageId: true,
        createdById: true,
        workspaceId: true,
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
        assignees: {
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgTeam: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          },
          take: 50, // CRITICAL: Limit to first 50 tasks for performance
          orderBy: [
            { status: 'asc' }, // Show incomplete tasks first
            { createdAt: 'asc' }
          ]
        },
        _count: {
          select: {
            tasks: true
          }
        },
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            // content: true, // REMOVED - load separately when viewing wiki
            updatedAt: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Enrich members with org position data (ProjectMember has no orgPositionId FK; lookup by userId)
    const workspaceId = project.workspaceId as string
    const memberUserIds = project.members.map((m: { userId: string }) => m.userId)
    if (memberUserIds.length > 0 && workspaceId) {
      const orgPositions = await prisma.orgPosition.findMany({
        where: {
          userId: { in: memberUserIds },
          workspaceId,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          title: true,
          team: {
            select: {
              name: true,
              department: { select: { name: true } },
            },
          },
        },
      })
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const workAllocations = await prisma.workAllocation.findMany({
        where: {
          personId: { in: memberUserIds },
          workspaceId,
          OR: [
            {
              startDate: { lte: weekEnd },
              OR: [
                { endDate: null },
                { endDate: { gte: weekStart } },
              ],
            },
          ],
        },
        select: {
          personId: true,
          allocationPercent: true,
        },
      })

      const orgByUser = new Map(orgPositions.map((op) => [op.userId, op]))
      const hoursByUser = new Map<string, number>()
      for (const alloc of workAllocations) {
        const current = hoursByUser.get(alloc.personId) ?? 0
        hoursByUser.set(alloc.personId, current + alloc.allocationPercent * 40)
      }

      const enrichedMembers = project.members.map((m: { id: string; userId: string; role: string; user: { id: string; name: string; email: string } }) => {
        const op = orgByUser.get(m.userId)
        const totalHours = hoursByUser.get(m.userId) ?? 0
        return {
          ...m,
          orgPosition: op
            ? {
                id: op.id,
                title: op.title,
                department: op.team?.department?.name ?? null,
                team: op.team ? { name: op.team.name } : null,
                workAllocations: totalHours > 0 ? [{ hoursAllocated: totalHours, projectId: null }] : [],
              }
            : undefined,
        }
      })
      project.members = enrichedMembers
    }

    // Add task pagination metadata
    const totalTaskCount = project._count.tasks
    const hasMoreTasks = totalTaskCount > 50
    const loadedTaskCount = project.tasks.length

    // Enhance response with pagination info
    const enrichedProject = {
      ...project,
      taskPagination: {
        totalTaskCount,
        loadedTaskCount,
        hasMoreTasks,
        limit: 50
      }
    }

    return NextResponse.json(enrichedProject)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PUT /api/projects/[projectId] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId
    const body = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Check project access (require member access for updates - creator/owner can always edit)
    // Convert auth.user to format expected by assertProjectAccess
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    
    try {
      // CRITICAL: Pass workspaceId to ensure workspace isolation
      await assertProjectAccess(nextAuthUser, projectId, ProjectRole.MEMBER, auth.workspaceId)
    } catch (accessError) {
      // If access check fails, return proper error response
      if (accessError instanceof Error) {
        if (accessError.message.includes('Unauthorized') || accessError.message.includes('not authenticated')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (accessError.message.includes('Forbidden') || accessError.message.includes('Insufficient')) {
          return NextResponse.json({ error: 'You do not have permission to edit this project' }, { status: 403 })
        }
        if (accessError.message.includes('not found')) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
      }
      // Re-throw if it's not a known access error
      throw accessError
    }

    // Extract assigneeIds and slackChannelHints before validation (not in schema)
    const assigneeIds = body.assigneeIds
    const slackChannelHints = body.slackChannelHints as string[] | undefined

    // Validate request body with Zod (exclude assigneeIds and slackChannelHints from validation)
    // Prisma will ignore unknown fields, so slackChannelHints won't cause errors
    const { assigneeIds: _, slackChannelHints: __, ...bodyWithoutExtras } = body
    
    const validatedData = ProjectUpdateSchema.parse(bodyWithoutExtras)
    const { 
      name, 
      excerpt,
      description, 
      status,
      priority,
      startDate,
      endDate,
      color,
      department,
      team,
      teamId,
      wikiPageId,
      ownerId,
      dailySummaryEnabled,
    } = validatedData

    // Check if project exists (ProjectSpace is not in schema; no projectSpace include)
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Visibility / memberUserIds: ProjectSpace not in schema; access is workspace + project members (see guards.ts)

    // Handle assignee updates if provided (with org linking and WorkAllocations)
    const capacityWarnings: Array<{
      userId: string
      reason: string
      currentPct: number
    }> = []
    
    if (assigneeIds !== undefined) {
      const startTime = Date.now()
      
      // Delete existing assignees
      await prisma.projectAssignee.deleteMany({
        where: { projectId }
      })
      
      if (assigneeIds.length > 0) {
        const defaultHours = 10
        
        // BATCH 1: Get all org positions in single query (instead of N queries)
        const orgPositions = await prisma.orgPosition.findMany({
          where: {
            userId: { in: assigneeIds },
            workspaceId: auth.workspaceId,
          },
          select: {
            id: true,
            userId: true,
          }
        })
        
        // Create lookup map for O(1) access
        const positionMap = new Map(
          orgPositions.map(pos => [pos.userId, pos])
        )
        
        // Filter to only valid assignees (those with org positions)
        const validAssigneeIds = assigneeIds.filter((id: string) => positionMap.has(id))
        
        if (validAssigneeIds.length > 0) {
          // BATCH 2: Create all assignee records at once (with orgPositionId)
          await prisma.projectAssignee.createMany({
            data: validAssigneeIds.map((userId: string) => ({
              projectId,
              userId,
              orgPositionId: positionMap.get(userId)?.id ?? null,
              workspaceId: auth.workspaceId,
            })),
            skipDuplicates: true
          })

          // BATCH 2b: Upsert ProjectPersonLink for each assignee (Loopbrain bridge)
          await Promise.all(
            validAssigneeIds.map((userId: string) =>
              prisma.projectPersonLink.upsert({
                where: { projectId_userId: { projectId, userId } },
                create: {
                  projectId,
                  userId,
                  orgPositionId: positionMap.get(userId)?.id ?? null,
                  role: 'CONTRIBUTOR',
                  workspaceId: auth.workspaceId,
                },
                update: {
                  orgPositionId: positionMap.get(userId)?.id ?? null,
                },
              })
            )
          )
          
          // BATCH 3: Run capacity checks and allocations in parallel (instead of sequential)
          const allocationPromises = validAssigneeIds.map(async (assigneeUserId: string) => {
            const orgPosition = positionMap.get(assigneeUserId)
            if (!orgPosition) return null
            
            const estimatedHours = defaultHours
            
            // Run capacity check
            const capacityCheck = await canTakeOnWork(
              assigneeUserId,
              auth.workspaceId,
              estimatedHours,
              120
            )
            
            // Track capacity warnings
            if (!capacityCheck.canTake && capacityCheck.reason) {
              capacityWarnings.push({
                userId: assigneeUserId,
                reason: capacityCheck.reason,
                currentPct: capacityCheck.currentPct,
              })
            }
            
            // Create allocation
            try {
              await createProjectAllocation({
                workspaceId: auth.workspaceId,
                orgPositionId: orgPosition.id,
                projectId,
                hoursAllocated: estimatedHours,
                description: `Project assignment: ${existingProject.name}`,
              })
            } catch (err) {
              console.error('Failed to create assignee WorkAllocation', {
                projectId,
                userId: assigneeUserId,
                error: err,
              })
            }
            
            return { assigneeUserId, success: true }
          })
          
          // Wait for all operations to complete in parallel
          await Promise.all(allocationPromises)
          
          // Performance logging (development only)
          const endTime = Date.now()
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Assignee batch operations completed in ${endTime - startTime}ms for ${validAssigneeIds.length} assignees`)
          }
        }
      }
    }

    // If owner changed, ensure new owner is a ProjectMember
    const newOwnerId = ownerId !== undefined ? (ownerId || null) : null
    if (newOwnerId) {
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: newOwnerId,
        },
      })

      if (!existingMember) {
        await prisma.projectMember.create({
          data: {
            projectId,
            userId: newOwnerId,
            role: 'OWNER',
            workspaceId: auth.workspaceId,
          },
        })
        logger.info('[Project Update] Added new owner as member', {
          projectId,
          ownerId: newOwnerId,
        })
      } else {
        await prisma.projectMember.update({
          where: { id: existingMember.id },
          data: { role: 'OWNER' },
        })
      }

      // Auto-link owner in ProjectPersonLink
      const ownerPosition = await prisma.orgPosition.findFirst({
        where: { userId: newOwnerId, workspaceId: auth.workspaceId, isActive: true },
        select: { id: true },
      })
      await prisma.projectPersonLink.upsert({
        where: { projectId_userId: { projectId, userId: newOwnerId } },
        create: {
          projectId,
          userId: newOwnerId,
          orgPositionId: ownerPosition?.id ?? null,
          role: 'OWNER',
          workspaceId: auth.workspaceId,
        },
        update: {
          role: 'OWNER',
          orgPositionId: ownerPosition?.id ?? null,
        },
      })
    }

    // Update the project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(excerpt !== undefined && { excerpt: excerpt?.trim() || null }),
        ...(description !== undefined && { description }),
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(color && { color }),
        ...(department && { department }),
        ...(team && { team }),
        ...(teamId !== undefined && { teamId: teamId ?? null }),
        ...(wikiPageId !== undefined && { wikiPageId: wikiPageId || null }),
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(dailySummaryEnabled !== undefined && { dailySummaryEnabled }),
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
        assignees: {
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgTeam: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          },
          take: 50, // CRITICAL: Limit to first 50 tasks for performance
          orderBy: [
            { status: 'asc' }, // Show incomplete tasks first
            { createdAt: 'asc' }
          ]
        },
        _count: {
          select: {
            tasks: true
          }
        },
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            // content: true, // REMOVED - load separately when viewing wiki
            updatedAt: true
          }
        }
      }
    })

    // Upsert project context in Loopbrain (fire-and-forget, don't block response)
    upsertProjectContext(projectId).catch((error) => {
      console.error('Failed to upsert project context after update', { projectId, error })
    })

    // Sync to goals if project has goal links
    if (status) {
      syncProjectToGoals(projectId, auth.user.userId).catch(err =>
        console.error('Failed to sync project status to goals:', err)
      )
    }

    // Close open INTEGRATION allocations when project reaches a terminal status
    if (
      status &&
      ['COMPLETED', 'CANCELLED'].includes(status) &&
      existingProject.status !== status
    ) {
      closeIntegrationAllocations(auth.workspaceId, projectId).catch((err) =>
        console.error('Failed to close integration allocations', { projectId, error: err })
      )
    }

    // Add task pagination metadata to update response
    const totalTaskCount = project._count.tasks
    const hasMoreTasks = totalTaskCount > 50

    // Include slackChannelHints, capacityWarnings, and taskPagination in response
    const responseProject = project as Record<string, unknown>
    responseProject.taskPagination = {
      totalTaskCount,
      loadedTaskCount: project.tasks.length,
      hasMoreTasks,
      limit: 50
    }
    if (slackChannelHints) {
      responseProject.slackChannelHints = slackChannelHints
    }
    if (capacityWarnings.length > 0) {
      responseProject.capacityWarnings = capacityWarnings
    }

    return NextResponse.json(responseProject)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Check project access (require admin access for deletion)
    // Convert auth.user to format expected by assertProjectAccess
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    // CRITICAL: Pass workspaceId to ensure workspace isolation
    await assertProjectAccess(nextAuthUser, projectId, ProjectRole.ADMIN, auth.workspaceId)

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete the project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: projectId }
    })

    return NextResponse.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    return handleApiError(error, request)
  }
}
