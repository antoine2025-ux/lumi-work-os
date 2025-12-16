import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  durationDays: z.number().int().min(1).max(365),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PRIVATE', 'ORG']).default('ORG'),
  tasks: z.array(z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    order: z.number().int().default(0),
    dueDay: z.number().int().min(1).optional(),
  })).min(1).max(30),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PRIVATE', 'ORG']).optional(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    order: z.number().int().default(0),
    dueDay: z.number().int().min(1).optional(),
  })).min(1).max(30).optional(),
})

// GET /api/onboarding/templates
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
    const q = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const workspaceId = auth.workspaceId

    const where = {
      workspaceId,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [templates, total] = await Promise.all([
      prisma.onboardingTemplate.findMany({
        where,
        include: {
          tasks: {
            orderBy: { order: 'asc' },
          },
          createdBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.onboardingTemplate.count({ where }),
    ])

    return NextResponse.json({
      templates,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (error instanceof Error && error.message.includes('No workspace found')) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch templates' } },
      { status: 500 }
    )
  }
}

// POST /api/onboarding/templates
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (admin only for creating templates)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    const userId = auth.user.userId
    const workspaceId = auth.workspaceId

    const template = await prisma.onboardingTemplate.create({
      data: {
        workspaceId,
        name: validatedData.name,
        durationDays: validatedData.durationDays,
        description: validatedData.description,
        visibility: validatedData.visibility,
        createdById: userId,
        tasks: {
          create: validatedData.tasks.map(task => ({
            title: task.title,
            description: task.description,
            order: task.order,
            dueDay: task.dueDay,
          })),
        },
      },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors } },
        { status: 400 }
      )
    }

    console.error('Error creating template:', error)
    
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (error instanceof Error && error.message.includes('No workspace found')) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Failed to create template' } },
      { status: 500 }
    )
  }
}








