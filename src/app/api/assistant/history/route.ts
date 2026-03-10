import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: auth.user.userId,
        workspaceId: auth.workspaceId
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

  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
