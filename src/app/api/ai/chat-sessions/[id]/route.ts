import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/ai/chat-sessions/[id] - Get a specific chat session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 GET /api/ai/chat-sessions/[id] - Starting request')
    
    // Temporarily bypass authentication for development
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const resolvedParams = await params
    console.log('📋 Session ID:', resolvedParams.id)
    
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: resolvedParams.id,
        userId: 'dev-user-1' // Temporary hardcoded user ID for development
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!chatSession) {
      console.log('❌ Chat session not found')
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    console.log('✅ Found chat session with', chatSession.messages.length, 'messages')
    console.log('📊 Session data:', chatSession)

    // Transform messages to include wikiPage data from metadata
    const transformedMessages = chatSession.messages.map((message: any) => {
      const transformedMessage = {
        id: message.id,
        type: message.type.toLowerCase(),
        content: message.content,
        sources: message.metadata?.sources || [],
        documentPlan: message.metadata?.documentPlan || null,
        wikiPage: message.metadata?.wikiPage || null
      }
      return transformedMessage
    })

    const transformedSession = {
      ...chatSession,
      messages: transformedMessages
    }

    return NextResponse.json(transformedSession)
  } catch (error) {
    console.error('💥 Error in GET /api/ai/chat-sessions/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ai/chat-sessions/[id] - Update chat session title
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { title } = await request.json()

    const chatSession = await prisma.chatSession.updateMany({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      },
      data: {
        title
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating chat session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/ai/chat-sessions/[id] - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Temporarily bypass authentication for development
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const resolvedParams = await params
    
    await prisma.chatSession.deleteMany({
      where: {
        id: resolvedParams.id,
        userId: 'dev-user-1' // Temporary hardcoded user ID for development
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
