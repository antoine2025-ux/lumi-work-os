import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// GET /api/ai/chat-sessions/[id]/messages - Get messages for a session
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
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: resolvedParams.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        content: true,
        createdAt: true,
        metadata: true
      }
    })

    return NextResponse.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        metadata: msg.metadata
      }))
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
