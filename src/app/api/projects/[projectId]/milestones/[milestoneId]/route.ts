import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { UpdateMilestoneSchema } from '@/lib/pm/schemas'
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/pm/guards'
import { emitProjectEvent } from '@/lib/pm/events'

const prisma = new PrismaClient()

// GET /api/projects/[projectId]/milestones/[milestoneId] - Get a specific milestone
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, milestoneId } = resolvedParams

    // Check project access
    const accessResult = await assertProjectAccess(projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

    const milestone = await prisma.milestone.findFirst({
      where: { 
        id: milestoneId,
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

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Error fetching milestone:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch milestone' 
    }, { status: 500 })
  }
}

// PATCH /api/projects/[projectId]/milestones/[milestoneId] - Update a milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, milestoneId } = resolvedParams

    // Check write access
    const accessResult = await assertProjectWriteAccess(projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = UpdateMilestoneSchema.parse(body)

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findFirst({
      where: { 
        id: milestoneId,
        projectId 
      }
    })

    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Update the milestone
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null
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
      'milestoneUpdated',
      {
        milestone,
        projectId,
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json(milestone)
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating milestone:', error)
    return NextResponse.json({ 
      error: 'Failed to update milestone' 
    }, { status: 500 })
  }
}

// DELETE /api/projects/[projectId]/milestones/[milestoneId] - Delete a milestone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId, milestoneId } = resolvedParams

    // Check write access
    const accessResult = await assertProjectWriteAccess(projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findFirst({
      where: { 
        id: milestoneId,
        projectId 
      }
    })

    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Check if milestone has tasks
    const taskCount = await prisma.task.count({
      where: { milestoneId }
    })

    if (taskCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete milestone with tasks. Please reassign or delete tasks first.' 
      }, { status: 400 })
    }

    // Delete the milestone
    await prisma.milestone.delete({
      where: { id: milestoneId }
    })

    // Emit Socket.IO event
    emitProjectEvent(
      projectId,
      'milestoneDeleted',
      {
        milestoneId,
        projectId,
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json({ 
      error: 'Failed to delete milestone' 
    }, { status: 500 })
  }
}
