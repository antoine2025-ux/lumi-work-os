import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/wiki/recent-pages - Get recently accessed pages for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get recent pages (ordered by updatedAt for now - later implement actual view tracking)
    const recentPages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        isPublished: true
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    })

    const formattedPages = recentPages.map(page => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      updatedAt: page.updatedAt,
      author: page.createdBy?.name || 'Unknown'
    }))

    logger.info('Recent wiki pages fetched', { userId: user.id, workspaceId, count: formattedPages.length })
    return NextResponse.json(formattedPages)
  } catch (error) {
    logger.error('Error fetching recent wiki pages', {}, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
