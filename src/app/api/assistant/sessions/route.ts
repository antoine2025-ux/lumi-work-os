import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/assistant/sessions - Create a new assistant session
export async function POST(request: NextRequest) {
  try {
    const { intent, target = 'wiki_page', workspaceId = 'cmgl0f0wa00038otlodbw5jhn' } = await request.json()
    
    if (!intent || !['doc_gen', 'assist'].includes(intent)) {
      return NextResponse.json({ error: 'Invalid intent. Must be "doc_gen" or "assist"' }, { status: 400 })
    }

    const session = await prisma.chatSession.create({
      data: {
        title: intent === 'doc_gen' ? 'Document Generation' : 'General Assistance',
        intent,
        target,
        phase: 'idle',
        workspaceId,
        userId: 'dev-user-1' // TODO: Get from session
      }
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error creating assistant session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/assistant/sessions - Get all assistant sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'
    
    const sessions = await prisma.chatSession.findMany({
      where: {
        workspaceId,
        userId: 'dev-user-1' // TODO: Get from session
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching assistant sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
