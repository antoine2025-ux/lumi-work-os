import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser, getCurrentWorkspace } from '@/lib/auth-helpers'

// GET /api/ai/chat-sessions - Get chat sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(user)
    if (!workspace) {
      return NextResponse.json({ 
        success: false,
        error: 'No workspace found' 
      }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: {
        workspaceId: workspace.id,
        userId: user.id
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
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch chat sessions' 
    }, { status: 500 })
  }
}

// POST /api/ai/chat-sessions - Create new chat session
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(user)
    if (!workspace) {
      return NextResponse.json({ 
        success: false,
        error: 'No workspace found' 
      }, { status: 404 })
    }

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
        workspaceId: workspace.id,
        userId: user.id
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
    console.error('Error creating chat session:', error)
    console.error('Error details:', error.message)
    console.error('Stack trace:', error.stack)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create chat session',
      details: error.message
    }, { status: 500 })
  }
}