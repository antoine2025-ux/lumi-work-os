import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// GET /api/ai/chat-sessions/[id] - Get specific chat session
export async function GET(
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
    const session = await prisma.chatSession.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ 
        success: false,
        error: 'Session not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        model: session.model || 'gpt-4-turbo',
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messageCount: session._count.messages
      }
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// DELETE /api/ai/chat-sessions/[id] - Delete chat session
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
    await prisma.chatSession.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}