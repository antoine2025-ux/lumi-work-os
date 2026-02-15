import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// GET /api/ai/chat-sessions - Get chat sessions
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: auth.user.userId
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      model: session.model || 'gpt-4-turbo',
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session._count.messages
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      total: formattedSessions.length
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// POST /api/ai/chat-sessions - Create new chat session
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    if (!auth.workspaceId) {
      return NextResponse.json({
        success: false,
        error: 'No workspace found'
      }, { status: 404 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { model, title } = await request.json()

    if (!model) {
      return NextResponse.json({
        success: false,
        error: 'Model is required'
      }, { status: 400 })
    }

    const session = await prisma.chatSession.create({
      data: {
        title: title || 'New Chat',
        model: model,
        workspaceId: auth.workspaceId,
        userId: auth.user.userId
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      session: {
        id: session.id,
        title: session.title,
        model: session.model,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messageCount: 0
      }
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
