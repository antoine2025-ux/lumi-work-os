import { NextRequest, NextResponse } from 'next/server'
import { UpdateEpicSchema } from '@/lib/pm/schemas'
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/pm/guards'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'
import { upsertEpicContext } from '@/lib/loopbrain/context-engine'
import { logger } from '@/lib/logger'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { ProjectRole } from '@prisma/client'


// GET /api/projects/[projectId]/epics/[epicId] - Get a specific epic
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { projectId, epicId } = resolvedParams

    // Check project access
    const nextAuthUser = { id: auth.user.userId, email: auth.user.email, name: auth.user.name } as any
    await assertProjectAccess(nextAuthUser, projectId, ProjectRole.VIEWER, auth.workspaceId)

    const epic = await prisma.epic.findFirst({
      where: { 
        id: epicId,
        projectId 
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            points: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    if (!epic) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 })
    }

    return NextResponse.json(epic)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PATCH /api/projects/[projectId]/epics/[epicId] - Update an epic
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { projectId, epicId } = resolvedParams

    // Check write access
    const nextAuthUser = { id: auth.user.userId, email: auth.user.email, name: auth.user.name } as any
    const accessResult = await assertProjectWriteAccess(nextAuthUser, projectId, auth.workspaceId)

    const body = await request.json()
    
    // Validate input
    const validatedData = UpdateEpicSchema.parse(body)

    // Check if epic exists
    const existingEpic = await prisma.epic.findFirst({
      where: { 
        id: epicId,
        projectId 
      }
    })

    if (!existingEpic) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 })
    }

    // Update the epic
    const epic = await prisma.epic.update({
      where: { id: epicId },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        color: validatedData.color,
        order: validatedData.order
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            points: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    // Emit Socket.IO event
    emitProjectEvent(
      projectId,
      'epicUpdated',
      {
        epic,
        projectId,
        userId: accessResult.user!.id
      }
    )

    // Asynchronously upsert epic context for Loopbrain
    // Log errors but don't block the main response
    console.log('[LB-EPIC] upsertEpicContext called after update:', epicId)
    upsertEpicContext(epicId)
      .catch((error) => logger.error('Failed to upsert epic context after update', { epicId, error }))

    return NextResponse.json(epic)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/projects/[projectId]/epics/[epicId] - Delete an epic
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { projectId, epicId } = resolvedParams

    // Check write access
    const nextAuthUser = { id: auth.user.userId, email: auth.user.email, name: auth.user.name } as any
    const accessResult = await assertProjectWriteAccess(nextAuthUser, projectId, auth.workspaceId)

    // Check if epic exists
    const existingEpic = await prisma.epic.findFirst({
      where: { 
        id: epicId,
        projectId 
      }
    })

    if (!existingEpic) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 })
    }

    // Check if epic has tasks
    const taskCount = await prisma.task.count({
      where: { epicId }
    })

    if (taskCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete epic with tasks. Please reassign or delete tasks first.' 
      }, { status: 400 })
    }

    // Delete the epic
    await prisma.epic.delete({
      where: { id: epicId }
    })

    // Emit Socket.IO event
    emitProjectEvent(
      projectId,
      'epicDeleted',
      {
        epicId,
        projectId,
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
