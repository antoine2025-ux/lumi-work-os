import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/wiki/search - Search wiki pages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    const type = searchParams.get('type') || 'all'
    const author = searchParams.get('author')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    // Build search conditions
    const whereConditions: any = {
      workspaceId,
      isPublished: true,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          content: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          excerpt: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            hasSome: [query]
          }
        }
      ]
    }

    // Apply filters
    if (type !== 'all') {
      // For now, we'll treat all pages as 'page' type since we don't have folders yet
      // You can extend this when you add folder functionality
    }

    if (author) {
      whereConditions.createdBy = {
        name: {
          contains: author,
          mode: 'insensitive'
        }
      }
    }

    if (tags.length > 0) {
      whereConditions.tags = {
        hasSome: tags
      }
    }

    const pages = await prisma.wikiPage.findMany({
      where: whereConditions,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        _count: {
          select: {
            comments: true,
            versions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50 // Limit results for performance
    })

    // Calculate relevance scores
    const resultsWithScores = pages.map(page => {
      let score = 0
      const queryLower = query.toLowerCase()
      
      // Title match gets highest score
      if (page.title.toLowerCase().includes(queryLower)) {
        score += 3
      }
      
      // Excerpt match gets medium score
      if (page.excerpt?.toLowerCase().includes(queryLower)) {
        score += 2
      }
      
      // Content match gets lower score
      if (page.content.toLowerCase().includes(queryLower)) {
        score += 1
      }
      
      // Tag match gets medium score
      if (page.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        score += 2
      }

      return {
        ...page,
        relevanceScore: score
      }
    })

    // Sort by relevance score
    resultsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({
      results: resultsWithScores,
      total: resultsWithScores.length,
      query
    })
  } catch (error) {
    console.error('Error searching wiki pages:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
