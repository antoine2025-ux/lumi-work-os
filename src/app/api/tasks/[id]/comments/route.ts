import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertProjectAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { logTaskHistory } from '@/lib/pm/history'
import { emitProjectEvent } from '@/lib/pm/events'
import { z } from 'zod'
import { prisma } from '@/lib/db'


const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  mentions: z.array(z.string()).optional().default([])
})

// GET /api/tasks/[id]/comments - Get comments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    // Get session and verify access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context for Prisma scoping
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get task with project info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check project access
    await assertProjectAccess(user, task.projectId)

    // Get comments with user info
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// POST /api/tasks/[id]/comments - Create a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    // Get session and verify access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context for Prisma scoping
    const authCtx = await getUnifiedAuth(request)
    setWorkspaceContext(authCtx.workspaceId)
    await assertAccess({
      userId: authCtx.user.userId,
      workspaceId: authCtx.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get task with project info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        project: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check project access
    await assertProjectAccess(user, task.projectId)

    // Validate mentioned users exist and are project members
    if (validatedData.mentions && validatedData.mentions.length > 0) {
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId: task.projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      const memberIds = projectMembers.map(member => member.user.id)
      const invalidMentions = validatedData.mentions.filter(mentionId => !memberIds.includes(mentionId))
      
      if (invalidMentions.length > 0) {
        return NextResponse.json({ 
          error: 'Some mentioned users are not project members' 
        }, { status: 400 })
      }
    }

    // Create the comment
    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId: session.user.id,
        content: validatedData.content,
        mentions: validatedData.mentions || undefined,
        workspaceId: authCtx.workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Log task history
    await logTaskHistory({
      taskId,
      actorId: session.user.id,
      field: 'comment',
      from: null,
      to: {
        commentId: comment.id,
        content: validatedData.content,
        mentions: validatedData.mentions
      }
    })

    // Emit Socket.IO event
    emitProjectEvent(task.projectId, 'taskCommentAdded', {
      taskId,
      comment: {
        ...comment,
        mentions: validatedData.mentions
      },
      userId: session.user.id
    })

    // TODO: Send notifications to mentioned users
    // This would integrate with your existing notification system
    if (validatedData.mentions && validatedData.mentions.length > 0) {
      // Get mentioned user details for notifications
      const mentionedUsers = await prisma.user.findMany({
        where: { id: { in: validatedData.mentions } },
        select: { id: true, name: true, email: true }
      })

      // Here you would send notifications to mentioned users
      // Example: await sendNotification(mentionedUsers, { type: 'mention', taskId, commentId: comment.id })
      console.log('Mentioned users:', mentionedUsers.map(u => u.name))
    }

    return NextResponse.json(comment)
  } catch (error) {
    return handleApiError(error, request)
  }
}
