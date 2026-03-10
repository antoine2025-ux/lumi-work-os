import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { AssistantSessionsCreateSchema } from '@/lib/validations/assistant'

// POST /api/assistant/sessions - Create a new assistant session
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = AssistantSessionsCreateSchema.parse(await request.json())
    const { intent = 'assist', title } = body
    const target = (body as any).target || 'wiki_page'

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
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// GET /api/assistant/sessions - Get all assistant sessions
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Return empty array if no workspace (public routes)
    if (!auth.workspaceId) {
      return NextResponse.json([])
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
    
    // Set workspace context for Prisma middleware
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    setWorkspaceContext(auth.workspaceId)
    
    const sessions = await prisma.chatSession.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc'
      },
      take: hasDraft ? 10 : 50
    })

    return NextResponse.json(sessions)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
