import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { TaskTemplateCreateSchema } from '@/lib/validations/tasks'

// GET /api/task-templates - Get all task templates for a workspace
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
    const category = searchParams.get('category')
    const isPublic = searchParams.get('isPublic')

    const where: any = { 
      OR: [
        { workspaceId: auth.workspaceId },
        { isPublic: true }
      ]
    }
    
    if (category) {
      where.category = category
    }

    if (isPublic === 'true') {
      where.isPublic = true
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(templates)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// POST /api/task-templates - Create a new task template
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = TaskTemplateCreateSchema.parse(await request.json())
    const { 
      name, 
      description, 
      category,
      isPublic,
      tasks = []
    } = body

    const template = await prisma.taskTemplate.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        description,
        category,
        isPublic,
        createdById: auth.user.userId,
        tasks: {
          create: tasks.map((task: any, index: number) => ({
            title: task.title,
            description: task.description || '',
            order: index,
            status: 'TODO',
            priority: task.priority || 'MEDIUM',
            points: task.points || null,
            tags: task.tags || [],
            workspaceId: auth.workspaceId
          }))
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}