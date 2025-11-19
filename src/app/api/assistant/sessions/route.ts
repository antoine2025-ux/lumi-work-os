import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'

// POST /api/assistant/sessions - Create a new assistant session
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
        workspaceId: auth.workspaceId,
        userId: auth.user.userId
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
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const hasDraft = searchParams.get('hasDraft') === 'true'
    
    const whereClause: any = {
      workspaceId: auth.workspaceId,
      userId: auth.user.userId
    }
    
    if (hasDraft) {
      whereClause.draftTitle = { not: null }
      whereClause.draftBody = { not: null }
      whereClause.phase = { not: 'published' }
    }
    
    const sessions = await prisma.chatSession.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc'
      },
      take: hasDraft ? 10 : 50
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching assistant sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
