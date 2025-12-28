import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { logger } from '@/lib/logger'

// GET /api/wiki/page-counts - Get page counts per workspace type
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const route = '/api/wiki/page-counts'
  
  try {
    const authStart = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStart
    
    // Assert workspace access (VIEWER can see page counts)
    const accessStart = performance.now()
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })
    const accessDurationMs = performance.now() - accessStart

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
    const dbStart = performance.now()
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
    let dbQueryDurationMs = 0

    // Count pages for each workspace type
    for (const workspace of workspaces) {
      const countStart = performance.now()
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
      dbQueryDurationMs += performance.now() - countStart

      counts[workspace.id] = count
    }
    const dbDurationMs = performance.now() - dbStart

    // Cache the result for 2 minutes
    await cache.set(cacheKey, counts, CACHE_TTL.SHORT)

    // Add HTTP caching headers for better performance
    const totalDurationMs = performance.now() - startTime
    logger.info('Page counts fetched', {
      route,
      workspaceId: auth.workspaceId,
      workspaceCount: workspaces.length,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      accessDurationMs: Math.round(accessDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      dbQueryDurationMs: Math.round(dbQueryDurationMs * 100) / 100,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    })
    
    const response = NextResponse.json(counts)
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    const totalDurationMs = performance.now() - startTime
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

