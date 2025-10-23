import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'


const createPlanSchema = z.object({
  employeeId: z.string().min(1),
  templateId: z.string().min(1).optional(),
  name: z.string().min(1).max(80),
  startDate: z.string().datetime(),
})

const updatePlanSchema = z.object({
  name: z.string().min(1).max(80).optional(),
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
      ...(status && { status: status as any }),
    }

    const [plans, total] = await Promise.all([
      prisma.onboardingPlan.findMany({
        where,
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
  } catch (error) {
    console.error('Error fetching plans:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch plans' } },
      { status: 500 }
    )
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

    // If templateId is provided, create tasks from template
    let tasksData = []
    if (validatedData.templateId) {
      const template = await prisma.onboardingTemplate.findUnique({
        where: { id: validatedData.templateId },
        include: { tasks: true },
      })

      if (!template) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Template not found' } },
          { status: 404 }
        )
      }

      const startDate = new Date(validatedData.startDate)
      tasksData = template.tasks.map(task => ({
        title: task.title,
        description: task.description,
        order: task.order,
        dueDate: task.dueDay ? new Date(startDate.getTime() + task.dueDay * 24 * 60 * 60 * 1000) : null,
        status: 'PENDING' as const,
      }))
    }

    const plan = await prisma.onboardingPlan.create({
      data: {
        workspaceId: auth.workspaceId,
        employeeId: validatedData.employeeId,
        templateId: validatedData.templateId,
        name: validatedData.name,
        startDate: new Date(validatedData.startDate),
        createdById: auth.user.userId,
        tasks: {
          create: tasksData,
        },
      },
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

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors } },
        { status: 400 }
      )
    }

    console.error('Error creating plan:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Failed to create plan' } },
      { status: 500 }
    )
  }
}
