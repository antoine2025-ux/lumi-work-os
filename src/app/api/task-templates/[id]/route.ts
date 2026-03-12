import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { TaskTemplateUpdateSchema } from '@/lib/validations/tasks'

// GET /api/task-templates/[id] - Get a specific task template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const templateId = resolvedParams.id

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        tasks: {
          orderBy: {
            order: 'asc'
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// PUT /api/task-templates/[id] - Update a task template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const templateId = resolvedParams.id
    const body = TaskTemplateUpdateSchema.parse(await request.json())
    
    const { 
      name, 
      description, 
      category,
      isPublic,
      metadata,
      tasks
    } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Check if template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: templateId }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Update the template
    const template = await prisma.taskTemplate.update({
      where: { id: templateId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(isPublic !== undefined && { isPublic }),
        ...(metadata !== undefined && { metadata: metadata as any }),
        ...(tasks && {
          tasks: {
            deleteMany: {}, // Delete existing tasks
            create: tasks.map((task: any, index: number) => ({
              title: task.title,
              description: task.description,
              status: task.status || 'TODO',
              priority: task.priority || 'MEDIUM',
              estimatedDuration: task.estimatedDuration,
              assigneeRole: task.assigneeRole,
              tags: task.tags || [],
              dependencies: task.dependencies || [],
              order: index,
              workspaceId: workspaceId
            }))
          }
        })
      },
      include: {
        tasks: {
          orderBy: {
            order: 'asc'
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(template)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// DELETE /api/task-templates/[id] - Delete a task template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const templateId = resolvedParams.id

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Check if template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: templateId }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Delete the template (cascade will handle tasks)
    await prisma.taskTemplate.delete({
      where: { id: templateId }
    })

    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

