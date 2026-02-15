import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { SubtaskCreateSchema } from '@/lib/validations/tasks'

// POST /api/tasks/[id]/subtasks - Create or update subtasks for a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const auth = await getUnifiedAuth(request)
    
    if (!auth.workspaceId) {
      return NextResponse.json({ 
        error: 'Workspace context is required' 
      }, { status: 401 })
    }

    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const { subtasks } = SubtaskCreateSchema.parse(await request.json())

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { 
        id: taskId,
        workspaceId: auth.workspaceId
      }
    })

    if (!task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    // Delete all existing subtasks
    await prisma.subtask.deleteMany({
      where: { taskId }
    })

    // Create new subtasks
    if (subtasks.length > 0) {
      await prisma.subtask.createMany({
        data: subtasks.map((subtask: any, index: number) => ({
          taskId,
          title: subtask.title,
          description: subtask.description || null,
          assigneeId: subtask.assigneeId || null,
          dueDate: subtask.dueDate ? new Date(subtask.dueDate) : null,
          order: index,
          workspaceId: auth.workspaceId
        }))
      })
    }

    // Return updated task with subtasks
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          orderBy: {
            order: 'asc'
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    return handleApiError(error, request)
  }
}



