import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { handleApiError } from '@/lib/api-errors'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/wiki/search - Search wiki pages
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    const author = searchParams.get('author')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    // SECURITY: Get wiki workspace IDs the user can access (PUBLIC, creator, or PRIVATE member)
    const accessibleWorkspaces = await prisma.wiki_workspaces.findMany({
      where: {
        workspace_id: auth.workspaceId,
        OR: [
          { visibility: 'PUBLIC' },
          { created_by_id: auth.user.userId },
          {
            visibility: 'PRIVATE',
            members: { some: { userId: auth.user.userId } },
          },
        ],
      },
      select: { id: true },
    })
    const accessibleIds = accessibleWorkspaces.map((w) => w.id)

    // Build search conditions with visibility filter
    // SECURITY: PRIVATE wiki-xxx pages only visible to members; personal only to creator
    const visibilityOr = [
      ...(accessibleIds.length > 0 ? [{ workspace_type: { in: accessibleIds } }] : []),
      { workspace_type: 'team' },
      { workspace_type: null },
      { workspace_type: '' },
      { workspace_type: 'personal', createdById: auth.user.userId },
      {
        workspace_type: { startsWith: 'personal-space-' },
        createdById: auth.user.userId,
      },
    ]

    const whereConditions: Record<string, unknown> = {
      workspaceId: auth.workspaceId,
      isPublished: true,
      AND: [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
            { tags: { hasSome: [query] } },
          ],
        },
        { OR: visibilityOr },
      ],
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
          mode: 'insensitive',
        },
      }
    }

    if (tags.length > 0) {
      whereConditions.tags = { hasSome: tags }
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
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
