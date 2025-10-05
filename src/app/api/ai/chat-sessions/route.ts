import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/ai/chat-sessions - Get all chat sessions for a user
export async function GET(request: NextRequest) {
  try {
    // Temporarily bypass authentication for development
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        workspaceId,
        userId: 'dev-user-1' // Temporary hardcoded user ID for development
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get the last message for preview
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(chatSessions)
  } catch (error) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ai/chat-sessions - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    // Temporarily bypass authentication for development
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { title, workspaceId } = await request.json()

    const chatSession = await prisma.chatSession.create({
      data: {
        title: title || 'New Chat',
        workspaceId: workspaceId || 'workspace-1',
        userId: 'dev-user-1' // Temporary hardcoded user ID for development
      }
    })

    return NextResponse.json(chatSession)
  } catch (error) {
    console.error('Error creating chat session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
