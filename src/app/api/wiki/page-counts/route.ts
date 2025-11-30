import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// GET /api/wiki/page-counts - Get page counts per workspace type
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
      CACHE_KEYS.WIKI_PAGES,
      auth.workspaceId,
      'page_counts'
    )

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Get all workspaces for this workspaceId
    const workspaces = await prisma.wiki_workspaces.findMany({
      where: {
        workspace_id: auth.workspaceId
      },
      select: {
        id: true,
        type: true,
        name: true
      }
    })

    console.log(`📊 Found ${workspaces.length} workspaces for workspaceId: ${auth.workspaceId}`)

    // Build counts for each workspace
    const counts: Record<string, number> = {}

    // Count pages for each workspace type
    for (const workspace of workspaces) {
      if (!workspace.id) {
        console.warn('⚠️ Skipping workspace with no ID:', workspace)
        continue
      }

      let count = 0
      const workspaceType = workspace.type || null

      if (workspaceType === 'personal') {
        // Personal Space: Count pages with workspace_type='personal' OR legacy pages with permissionLevel='personal'
        count = await prisma.wikiPage.count({
          where: {
            workspaceId: auth.workspaceId,
            isPublished: true,
            OR: [
              { workspace_type: 'personal' },
              {
                AND: [
                  {
                    OR: [
                      { workspace_type: null },
                      { workspace_type: '' }
                    ]
                  },
                  { permissionLevel: 'personal' }
                ]
              }
            ]
          }
        })
      } else if (workspaceType === 'team') {
        // Team Workspace: Count pages with workspace_type='team' OR legacy pages (null workspace_type with non-personal permission)
        // Exclude personal pages explicitly
        count = await prisma.wikiPage.count({
          where: {
            workspaceId: auth.workspaceId,
            isPublished: true,
            AND: [
              {
                OR: [
                  { workspace_type: 'team' },
                  {
                    AND: [
                      {
                        OR: [
                          { workspace_type: null },
                          { workspace_type: '' }
                        ]
                      },
                      { permissionLevel: { not: 'personal' } }
                    ]
                  }
                ]
              },
              {
                NOT: {
                  workspace_type: 'personal'
                }
              }
            ]
          }
        })
      } else {
        // Custom Workspace: Count pages with workspace_type matching this workspace ID
        count = await prisma.wikiPage.count({
          where: {
            workspaceId: auth.workspaceId,
            isPublished: true,
            workspace_type: workspace.id,
            // Exclude team and personal pages
            NOT: {
              OR: [
                { workspace_type: 'team' },
                { workspace_type: 'personal' }
              ]
            }
          }
        })
      }

      counts[workspace.id] = count
    }

    // Cache the result for 2 minutes
    await cache.set(cacheKey, counts, CACHE_TTL.SHORT)

    // Add HTTP caching headers for better performance
    const response = NextResponse.json(counts)
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    console.error('Error fetching page counts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    return NextResponse.json({ 
      error: 'Failed to fetch page counts',
      details: errorMessage 
    }, { status: 500 })
  }
}

