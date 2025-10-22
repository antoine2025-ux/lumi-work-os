import { NextRequest, NextResponse } from 'next/server'
import { UpdateEpicSchema } from '@/lib/pm/schemas'
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/pm/guards'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'


// GET /api/projects/[projectId]/epics/[epicId] - Get a specific epic
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, epicId } = resolvedParams

    // Check project access
    const accessResult = await assertProjectAccess(projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

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
    console.error('Error fetching epic:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch epic' 
    }, { status: 500 })
  }
}

// PATCH /api/projects/[projectId]/epics/[epicId] - Update an epic
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, epicId } = resolvedParams

    // Check write access
    const accessResult = await assertProjectWriteAccess(projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

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

    return NextResponse.json(epic)
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating epic:', error)
    return NextResponse.json({ 
      error: 'Failed to update epic' 
    }, { status: 500 })
  }
}

// DELETE /api/projects/[projectId]/epics/[epicId] - Delete an epic
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, epicId } = resolvedParams

    // Check write access
    const accessResult = await assertProjectWriteAccess(projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

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
    console.error('Error deleting epic:', error)
    return NextResponse.json({ 
      error: 'Failed to delete epic' 
    }, { status: 500 })
  }
}
