import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ai/chat-sessions/[id] - Get specific chat session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error('Error fetching chat session:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch chat session' 
    }, { status: 500 })
  }
}

// DELETE /api/ai/chat-sessions/[id] - Delete chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    await prisma.chatSession.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error deleting chat session:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete chat session' 
    }, { status: 500 })
  }
}