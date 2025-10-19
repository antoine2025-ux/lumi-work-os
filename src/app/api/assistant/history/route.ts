import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Temporarily bypass authentication for development
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: 'dev-user-1', // Hardcoded for development
        workspaceId: 'cmgl0f0wa00038otlodbw5jhn'
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
