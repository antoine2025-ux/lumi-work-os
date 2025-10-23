import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser, getCurrentWorkspace } from '@/lib/auth-helpers'

// POST /api/assistant/sessions - Create a new assistant session
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(user)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { intent, target = 'wiki_page' } = await request.json()
    
    if (!intent || !['doc_gen', 'assist'].includes(intent)) {
      return NextResponse.json({ error: 'Invalid intent. Must be "doc_gen" or "assist"' }, { status: 400 })
    }

    const session = await prisma.chatSession.create({
      data: {
        title: intent === 'doc_gen' ? 'Document Generation' : 'General Assistance',
        intent,
        target,
        phase: 'idle',
        workspaceId: workspace.id,
        userId: user.id
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
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(user)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }
    
    const sessions = await prisma.chatSession.findMany({
      where: {
        workspaceId: workspace.id,
        userId: user.id
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
