import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updatePlanProgress } from '@/lib/progress'
import { prisma } from '@/lib/db'


const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']).optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
})

// PATCH /api/onboarding/tasks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Check if task exists
    const existingTask = await prisma.onboardingTask.findUnique({
      where: { id: params.id },
      include: { plan: true },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.status && { status: validatedData.status }),
      ...(validatedData.title && { title: validatedData.title }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
    }

    // If status is being changed to DONE, set completedAt
    if (validatedData.status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date()
    }

    // If status is being changed from DONE to something else, clear completedAt
    if (validatedData.status && validatedData.status !== 'DONE' && existingTask.status === 'DONE') {
      updateData.completedAt = null
    }

    const task = await prisma.onboardingTask.update({
      where: { id: params.id },
      data: updateData,
      include: {
        plan: {
          include: {
            employee: {
              select: { name: true, email: true },
            },
            template: {
              select: { name: true, durationDays: true },
            },
          },
        },
      },
    })

    // Update plan progress
    await updatePlanProgress(task.planId)

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors } },
        { status: 400 }
      )
    }

    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update task' } },
      { status: 500 }
    )
  }
}






