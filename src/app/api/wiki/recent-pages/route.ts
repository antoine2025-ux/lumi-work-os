import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

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
    const limit = parseInt(searchParams.get('limit') || '10')
    const workspaceType = searchParams.get('workspace_type') // Filter by workspace_type if provided

    // Generate cache key
    const cacheKey = cache.generateKey(
      CACHE_KEYS.WIKI_PAGES,
      auth.workspaceId,
      `recent_${limit}_${workspaceType || 'all'}`
    )

    // OPTIMIZED: Check cache first (non-blocking)
    // Use Promise.race to avoid waiting too long for cache
    const cachePromise = cache.get(cacheKey)
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 50)) // 50ms timeout
    
    const cached = await Promise.race([cachePromise, timeoutPromise]) as any
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Build where clause - filter by workspaceId and optionally by workspace_type
    const baseWhere: any = {
      workspaceId: auth.workspaceId,
      isPublished: true
    }

    // If workspace_type is provided, filter by it
    // This allows filtering for 'personal', 'team', or custom workspace IDs
    let whereClause: any = baseWhere
    
    if (workspaceType) {
      if (workspaceType === 'team') {
        // For team workspace, include pages with workspace_type='team' OR legacy pages (null workspace_type with non-personal permission)
        whereClause = {
          ...baseWhere,
          OR: [
            { workspace_type: 'team' },
            {
              workspace_type: null,
              permissionLevel: { not: 'personal' }
            },
            {
              workspace_type: '',
              permissionLevel: { not: 'personal' }
            }
          ]
        }
      } else {
        // For personal or custom workspaces, filter strictly by workspace_type
        whereClause = {
          ...baseWhere,
          workspace_type: workspaceType
        }
      }
    }

    // Optimized query: Use select instead of include, don't load full content
    const recentPages = await prisma.wikiPage.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true, // Use excerpt instead of full content
        permissionLevel: true,
        workspace_type: true,
        updatedAt: true,
        createdAt: true,
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
      take: Math.min(limit, 100) // Cap at 100 to prevent huge responses
    })

    const formattedPages = recentPages.map(page => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      updatedAt: page.updatedAt,
      author: page.createdBy?.name || 'Unknown',
      permissionLevel: page.permissionLevel,
      // Preserve null/undefined - don't default to 'team' as it breaks filtering
      // The frontend will handle null values for legacy pages
      workspace_type: page.workspace_type ?? null
    }))

    // Cache the result for 2 minutes
    await cache.set(cacheKey, formattedPages, CACHE_TTL.SHORT)

    // Add HTTP caching headers for better performance
    const response = NextResponse.json(formattedPages)
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    console.error('Error fetching recent pages:', error)
    return NextResponse.json({ error: 'Failed to fetch recent pages' }, { status: 500 })
  }
}