import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { handleApiError } from '@/lib/api-errors'
import { canAccessWikiWorkspace } from '@/lib/wiki/permissions'

// GET /api/wiki/favorites - Get all favorite pages for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (VIEWER can see favorites)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
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
    // SECURITY: Exclude pages the user cannot access (personal, PRIVATE wiki workspaces)
    const formattedPages: Array<{
      id: string
      title: string
      slug: string
      author: string
      updatedAt: string
      viewCount: number
      tags: string[]
      permissionLevel: string
      workspace_type: string | null
    }> = []
    for (const fav of favorites) {
      if (!fav.wiki_pages) continue
      const page = fav.wiki_pages
      // Personal pages - only include if creator
      if (page.workspace_type === 'personal' || page.workspace_type?.startsWith('personal-space-')) {
        if (page.createdBy?.id !== auth.user.userId) continue
      }
      // PRIVATE wiki workspace pages - only include if user has access
      if (page.workspace_type?.startsWith('wiki-')) {
        const hasAccess = await canAccessWikiWorkspace(auth.user.userId, page.workspace_type)
        if (!hasAccess) continue
      }
      formattedPages.push({
        id: page.id,
        title: page.title,
        slug: page.slug,
        author: page.createdBy?.name || 'Unknown',
        updatedAt: page.updatedAt.toISOString(),
        viewCount: page.view_count || 0,
        tags: page.tags || [],
        permissionLevel: page.permissionLevel,
        workspace_type: page.workspace_type ?? null,
      })
    }

    // Cache the result for 2 minutes
    await cache.set(cacheKey, formattedPages, CACHE_TTL.SHORT)

    // Add HTTP caching headers for better performance
    const response = NextResponse.json(formattedPages)
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}