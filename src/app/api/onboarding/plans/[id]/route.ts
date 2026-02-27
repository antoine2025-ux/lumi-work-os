import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updatePlanProgress } from '@/lib/progress'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

const updatePlanSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// GET /api/onboarding/plans/[id]
export async function GET(
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
    const plan = await prisma.onboardingPlan.findUnique({
      where: { id: resolvedParams.id },
      include: {
        users: {
          select: { name: true, email: true },
        },
        template: {
          select: { name: true, duration: true },
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json(plan)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PATCH /api/onboarding/plans/[id]
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
    const validatedData = updatePlanSchema.parse(body)

    // Check if plan exists
    const existingPlan = await prisma.onboardingPlan.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.status && { status: validatedData.status }),
      ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
      ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
    }

    const plan = await prisma.onboardingPlan.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        users: {
          select: { name: true, email: true },
        },
        template: {
          select: { name: true, duration: true },
        },
      },
    })

    // Update progress if status changed
    if (validatedData.status) {
      await updatePlanProgress(resolvedParams.id)
    }

    return NextResponse.json(plan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.issues } },
        { status: 400 }
      )
    }
    return handleApiError(error, request)
  }
}

// DELETE /api/onboarding/plans/[id]
export async function DELETE(
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
    // Check if plan exists
    const existingPlan = await prisma.onboardingPlan.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      )
    }

    // Delete plan (tasks will be cascade deleted)
    await prisma.onboardingPlan.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}






