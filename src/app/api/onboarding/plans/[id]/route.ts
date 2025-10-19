import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { updatePlanProgress } from '@/lib/progress'

const prisma = new PrismaClient()

const updatePlanSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// GET /api/onboarding/plans/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.onboardingPlan.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: { name: true, email: true },
        },
        template: {
          select: { name: true, durationDays: true },
        },
        tasks: {
          orderBy: { order: 'asc' },
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
    console.error('Error fetching plan:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch plan' } },
      { status: 500 }
    )
  }
}

// PATCH /api/onboarding/plans/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = updatePlanSchema.parse(body)

    // Check if plan exists
    const existingPlan = await prisma.onboardingPlan.findUnique({
      where: { id: params.id },
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
      where: { id: params.id },
      data: updateData,
      include: {
        employee: {
          select: { name: true, email: true },
        },
        template: {
          select: { name: true, durationDays: true },
        },
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    // Update progress if status changed
    if (validatedData.status) {
      await updatePlanProgress(params.id)
    }

    return NextResponse.json(plan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors } },
        { status: 400 }
      )
    }

    console.error('Error updating plan:', error)
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update plan' } },
      { status: 500 }
    )
  }
}

// DELETE /api/onboarding/plans/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if plan exists
    const existingPlan = await prisma.onboardingPlan.findUnique({
      where: { id: params.id },
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      )
    }

    // Delete plan (tasks will be cascade deleted)
    await prisma.onboardingPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: 'Failed to delete plan' } },
      { status: 500 }
    )
  }
}






