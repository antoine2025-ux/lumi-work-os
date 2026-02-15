import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// Schemas
// ============================================================================

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
})

// ============================================================================
// GET /api/goals/[goalId]/comments - Get goal comments
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        workspaceId: auth.workspaceId,
      },
    })

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    const comments = await prisma.goalComment.findMany({
      where: {
        goalId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(comments)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/goals/[goalId]/comments - Add a comment to goal
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateCommentSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        workspaceId: auth.workspaceId,
      },
    })

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // Create comment
    const comment = await prisma.goalComment.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        content: data.content,
        authorId: auth.user.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'COMMENT_ADDED',
        meta: {
          commentId: comment.id,
        },
      },
    })

    // Log goal update
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'COMMENT_ADDED',
        content: data.content,
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
