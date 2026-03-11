import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updatePlanProgress } from '@/lib/progress'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).optional(),
  notes: z.string().max(500).optional(),
})

// PATCH /api/onboarding/tasks/[id]
// Note: This endpoint updates a task assignment, not the template task itself
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Check if task assignment exists
    const existingAssignment = await prisma.onboarding_task_assignments.findUnique({
      where: { id: resolvedParams.id },
      include: { 
        onboarding_plans: true,
        onboarding_tasks: true,
      },
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task assignment not found' } },
        { status: 404 }
      )
    }

    // Prepare update data
    interface UpdateData {
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
      completedAt?: Date | null
      notes?: string | null
    }
    
    const updateData: UpdateData = {}
    
    if (validatedData.status) {
      updateData.status = validatedData.status
    }
    
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    
    // If status is being changed to COMPLETED, set completedAt
    if (validatedData.status === 'COMPLETED' && existingAssignment.status !== 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    // If status is being changed from COMPLETED to something else, clear completedAt
    if (validatedData.status && validatedData.status !== 'COMPLETED' && existingAssignment.status === 'COMPLETED') {
      updateData.completedAt = null
    }

    const assignment = await prisma.onboarding_task_assignments.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        onboarding_plans: {
          include: {
            users: {
              select: { name: true, email: true },
            },
            template: {
              select: { name: true, duration: true },
            },
          },
        },
        onboarding_tasks: true,
      },
    })

    // Update plan progress
    await updatePlanProgress(assignment.planId)

    return NextResponse.json(assignment)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
















