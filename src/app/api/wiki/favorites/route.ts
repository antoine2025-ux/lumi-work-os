import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// GET /api/wiki/favorites - Get all favorite pages for the authenticated user
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

    // Generate cache key
    const cacheKey = cache.generateKey(
      CACHE_KEYS.FAVORITES,
      auth.workspaceId,
      auth.user.userId
    )

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Get favorite pages for the user using the wiki_favorites table
    const favorites = await prisma.wikiFavorite.findMany({
      where: {
        user_id: auth.user.userId,
        wiki_pages: {
          workspaceId: auth.workspaceId,
          isPublished: true
        }
      },
      select: {
        page_id: true,
        created_at: true,
        wiki_pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            updatedAt: true,
            createdAt: true,
            view_count: true,
            tags: true,
            permissionLevel: true,
            workspace_type: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Transform to match RecentPage interface
    const formattedPages = favorites
      .filter(fav => fav.wiki_pages) // Filter out any null pages
      .map(fav => ({
        id: fav.wiki_pages!.id,
        title: fav.wiki_pages!.title,
        slug: fav.wiki_pages!.slug,
        author: fav.wiki_pages!.createdBy?.name || 'Unknown',
        updatedAt: fav.wiki_pages!.updatedAt.toISOString(),
        viewCount: fav.wiki_pages!.view_count || 0,
        tags: fav.wiki_pages!.tags || [],
        permissionLevel: fav.wiki_pages!.permissionLevel,
        workspace_type: fav.wiki_pages!.workspace_type || null
      }))

    // Cache the result for 2 minutes
    await cache.set(cacheKey, formattedPages, CACHE_TTL.SHORT)

    // Add HTTP caching headers for better performance
    const response = NextResponse.json(formattedPages)
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    console.error('Error fetching favorite pages:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}