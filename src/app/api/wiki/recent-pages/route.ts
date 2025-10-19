import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get recent pages
    const recentPages = await prisma.wikiPage.findMany({
      where: {
        workspaceId: workspaceId,
        isPublished: true
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
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

    return NextResponse.json(formattedPages)
  } catch (error) {
    console.error('Error fetching recent pages:', error)
    return NextResponse.json({ error: 'Failed to fetch recent pages' }, { status: 500 })
  }
}