import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { intent, workspaceId } = await request.json()

    // Create a new assistant session
    const session = await prisma.chatSession.create({
      data: {
        title: intent === 'doc_gen' ? 'Document Generation' : 
               intent === 'project_creation' ? 'Project Creation' : 'General Assistance',
        workspaceId: workspaceId || 'workspace-1',
        userId: 'dev-user-1', // Temporary for development
        intent: intent || 'assist',
        target: intent === 'project_creation' ? 'project' : 'wiki_page',
        phase: 'idle',
        requirementNotes: null,
        draftTitle: null,
        draftBody: null,
        draftFormat: 'markdown',
        pageSettings: null,
        wikiUrl: null,
        projectUrl: null,
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      phase: session.phase,
      intent: session.intent
    })

  } catch (error) {
    console.error('Error creating assistant session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)

  } catch (error) {
    console.error('Error fetching assistant session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
