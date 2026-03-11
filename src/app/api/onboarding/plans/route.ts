import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { OnboardingStatus } from '@prisma/client'


const createPlanSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1).optional(),
  title: z.string().min(1).max(80),
  startDate: z.string().datetime(),
})

const _updatePlanSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// GET /api/onboarding/plans
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = {
      workspaceId: auth.workspaceId,
      ...(status && { status: status as OnboardingStatus }),
    }

    const [plans, total] = await Promise.all([
      prisma.onboardingPlan.findMany({
        where,
        include: {
          users: {
            select: { name: true, email: true },
          },
          template: {
            select: { name: true, duration: true },
          },
          onboarding_task_assignments: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.onboardingPlan.count({ where }),
    ])

    return NextResponse.json({
      plans,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// POST /api/onboarding/plans
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const validatedData = createPlanSchema.parse(body)

    // If templateId is provided, create task assignments from template
    let taskAssignmentsData: Array<{
      id: string
      taskId: string
      status: 'PENDING'
      workspaceId: string
      updatedAt: Date
    }> = []
    if (validatedData.templateId) {
      const template = await prisma.onboardingTemplate.findUnique({
        where: { id: validatedData.templateId },
        include: { onboarding_tasks: true },
      })

      if (!template) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Template not found' } },
          { status: 404 }
        )
      }

      taskAssignmentsData = template.onboarding_tasks.map(task => ({
        id: `${validatedData.userId}-${task.id}-${Date.now()}`,
        taskId: task.id,
        status: 'PENDING' as const,
        workspaceId: auth.workspaceId,
        updatedAt: new Date(),
      }))
    }

    const plan = await prisma.onboardingPlan.create({
      data: {
        workspaceId: auth.workspaceId,
        userId: validatedData.userId,
        templateId: validatedData.templateId,
        title: validatedData.title,
        startDate: new Date(validatedData.startDate),
        onboarding_task_assignments: {
          create: taskAssignmentsData,
        },
      },
      include: {
        users: {
          select: { name: true, email: true },
        },
        template: {
          select: { name: true, duration: true },
        },
        onboarding_task_assignments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
