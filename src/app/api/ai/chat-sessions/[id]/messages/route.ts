import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ai/chat-sessions/[id]/messages - Get messages for a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: params.id },
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
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch messages' 
    }, { status: 500 })
  }
}
