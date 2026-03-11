import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { TaskTemplateApplySchema } from '@/lib/validations/tasks'

// POST /api/task-templates/[id]/apply - Apply a template to create tasks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const templateId = resolvedParams.id
    const body = TaskTemplateApplySchema.parse(await request.json())
    const { 
      projectId,
      taskCount,
    } = body

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ 
        error: 'Project not found' 
      }, { status: 404 })
    }

    // Get the template
    const template = await (prisma.taskTemplate.findUnique as Function)({
      where: { id: templateId },
      include: {
        templateData: true
      }
    }) as {
      id: string
      name: string
      description: string | null
      workspaceId: string
      isPublic: boolean
      templateData: any
    } | null

    if (!template) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 })
    }

    // Check if template is accessible (public or belongs to workspace)
    if (!template.isPublic && template.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ 
        error: 'Template not accessible' 
      }, { status: 403 })
    }

    // Use authenticated user ID
    const createdById = auth.user.userId

    const createdTasks = []

    // Create tasks based on template
    for (let i = 0; i < taskCount; i++) {
      try {
        const taskData = template.templateData as any
        const taskName = taskCount > 1 ? `${template.name} ${i + 1}` : template.name
        
        const task = await prisma.task.create({
          data: {
            projectId: projectId,
            workspaceId: auth.workspaceId, // Always use authenticated workspace
            title: taskName,
            description: template.description || '',
            status: taskData?.status || 'TODO',
            priority: taskData?.priority || 'MEDIUM',
            tags: taskData?.tags || [],
            createdById: createdById,
            assigneeId: createdById
          }
        })
        
        createdTasks.push(task)
      } catch (_error: unknown) {
        // non-blocking: skip failed task
      }
    }

    return NextResponse.json({
      success: true,
      tasks: createdTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt
      }))
    })

  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}