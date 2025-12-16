import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { ProjectUpdateSchema } from '@/lib/pm/schemas'
import { assertProjectAccess } from '@/lib/pm/guards'
import { ProjectRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { upsertProjectContext } from '@/lib/loopbrain/context-engine'


// GET /api/projects/[projectId] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
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

    const project = await prisma.project.findUnique({
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
        projectSpaceId: true,
        projectSpace: {
          select: {
            id: true,
            name: true,
            visibility: true
          }
        },
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
          orderBy: {
            createdAt: 'asc'
          }
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
            content: true,
            updatedAt: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Error fetching project:', error)
    
    // Handle specific access control errors
    if (error.message === 'Unauthorized: User not authenticated.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message === 'Project not found.') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error.message === 'Forbidden: Insufficient project permissions.' || 
        error.message === 'Forbidden: You do not have access to this project space.') {
      // Try to include projectSpaceId in error response for better UX
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { projectSpaceId: true }
        })
        return NextResponse.json({ 
          error: 'Forbidden: Insufficient project permissions',
          projectSpaceId: project?.projectSpaceId || null
        }, { status: 403 })
      } catch {
        return NextResponse.json({ error: 'Forbidden: Insufficient project permissions' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch project'
    }, { status: 500 })
  }
}

// PUT /api/projects/[projectId] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
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
    
    console.log('[PUT /api/projects] Request body (without assigneeIds):', JSON.stringify(bodyWithoutExtras, null, 2))
    
    const validatedData = ProjectUpdateSchema.parse(bodyWithoutExtras)
    
    console.log('[PUT /api/projects] Validation passed:', Object.keys(validatedData))
    const { 
      name, 
      description, 
      status,
      priority,
      startDate,
      endDate,
      color,
      department,
      team,
      wikiPageId,
      ownerId,
      dailySummaryEnabled,
      visibility,
      memberUserIds = []
    } = validatedData

    // Check if project exists and get current ProjectSpace info
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectSpace: {
          select: {
            id: true,
            visibility: true,
            name: true
          }
        }
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Handle visibility changes
    let newProjectSpaceId: string | undefined = existingProject.projectSpaceId || undefined
    
    if (visibility !== undefined) {
      const { getOrCreateGeneralProjectSpace, createPrivateProjectSpace } = await import('@/lib/pm/project-space-helpers')
      
      if (visibility === 'PUBLIC') {
        // Switch to PUBLIC: move to General space
        newProjectSpaceId = await getOrCreateGeneralProjectSpace(auth.workspaceId)
        // If migration not run, newProjectSpaceId will be null - that's OK (legacy mode)
      } else if (visibility === 'TARGETED') {
        // Switch to TARGETED: create new private space or use existing
        const currentSpace = existingProject.projectSpace
        if (currentSpace && currentSpace.visibility === 'TARGETED') {
          // Already TARGETED: update members if provided
          newProjectSpaceId = currentSpace.id
          
          if (memberUserIds.length > 0) {
            // Add new members (creator is always included)
            const allMemberIds = [auth.user.userId, ...memberUserIds.filter(id => id !== auth.user.userId)]
            await prisma.projectSpaceMember.createMany({
              data: allMemberIds.map(userId => ({
                projectSpaceId: currentSpace.id,
                userId
              })),
              skipDuplicates: true
            })
          }
        } else {
          // Switching from PUBLIC to TARGETED: create new private space
          newProjectSpaceId = await createPrivateProjectSpace(
            auth.workspaceId,
            existingProject.name,
            auth.user.userId,
            memberUserIds
          )
          // If migration not run, newProjectSpaceId will be null - that's OK (legacy mode)
        }
      }
    }

    // Handle assignee updates if provided
    if (assigneeIds !== undefined) {
      // Remove existing assignees
      await prisma.projectAssignee.deleteMany({
        where: { projectId }
      })
      
      // Add new assignees
      if (assigneeIds.length > 0) {
        await prisma.projectAssignee.createMany({
          data: assigneeIds.map((userId: string) => ({
            projectId,
            userId
          }))
        })
      }
    }

    // Update the project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(color && { color }),
        ...(department && { department }),
        ...(team && { team }),
        ...(wikiPageId !== undefined && { wikiPageId: wikiPageId || null }),
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(dailySummaryEnabled !== undefined && { dailySummaryEnabled }),
        ...(newProjectSpaceId !== undefined && { projectSpaceId: newProjectSpaceId }),
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
          orderBy: {
            createdAt: 'asc'
          }
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
            content: true,
            updatedAt: true
          }
        }
      }
    })

    // Upsert project context in Loopbrain (fire-and-forget, don't block response)
    upsertProjectContext(projectId).catch((error) => {
      console.error('Failed to upsert project context after update', { projectId, error })
    })

    // Include slackChannelHints in response if provided (not persisted, but returned for UI)
    const responseProject = project as any
    if (slackChannelHints) {
      responseProject.slackChannelHints = slackChannelHints
    }
    
    return NextResponse.json(responseProject)
  } catch (error) {
    console.error('Error updating project:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.errors)
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }, { status: 400 })
    }
    
    // Handle RBAC errors
    if (error.message === 'Unauthorized: User not authenticated.' || 
        error.message === 'User not found.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message === 'Project not found.') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error.message === 'Forbidden: Insufficient project permissions.') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update project' 
    }, { status: 500 })
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
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
    console.error('Error deleting project:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      if (error.message === 'Forbidden: Insufficient project permissions.') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete project' 
    }, { status: 500 })
  }
}
