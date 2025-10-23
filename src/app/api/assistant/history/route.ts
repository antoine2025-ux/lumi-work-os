import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser, getCurrentWorkspace } from '@/lib/auth-helpers'

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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: user.id,
        workspaceId: workspace.id
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        intent: true,
        phase: true,
        draftTitle: true,
        wikiUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    return NextResponse.json({
      sessions,
      hasMore: sessions.length === limit
    })

  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
