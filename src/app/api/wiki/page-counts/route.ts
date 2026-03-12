import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/api-errors'

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

    // Generate cache key — include userId so personal page counts are per-user
    const cacheKey = cache.generateKey(
      CACHE_KEYS.WIKI_PAGES,
      auth.workspaceId,
      `page_counts_${auth.user.userId}`
    )

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Get workspaces the user can access (PUBLIC, creator, or PRIVATE member)
    const dbStart = performance.now()
    let workspaces: Array<{ id: string; type: string | null; name: string }>
    try {
      workspaces = await prisma.wiki_workspaces.findMany({
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
        select: {
          id: true,
          type: true,
          name: true,
        },
      })
    } catch (visibilityError) {
      // Fallback: visibility/members schema may not be deployed yet (e.g. pre-migration)
      logger.warn('Page counts: visibility filter failed, falling back to unfiltered query', {
        error: visibilityError instanceof Error ? visibilityError.message : String(visibilityError),
      })
      workspaces = await prisma.wiki_workspaces.findMany({
        where: { workspace_id: auth.workspaceId },
        select: { id: true, type: true, name: true },
      })
    }

    // Build counts for each workspace
    const counts: Record<string, number> = {}
    let dbQueryDurationMs = 0

    // Count pages for each workspace type
    for (const workspace of workspaces) {
      const countStart = performance.now()
      if (!workspace.id) {
        continue
      }

      let count = 0
      const workspaceType = workspace.type || null

      if (workspaceType === 'personal') {
        // SECURITY: Personal Space counts only pages created by the requesting user
        count = await prisma.wikiPage.count({
          where: {
            workspaceId: auth.workspaceId,
            isPublished: true,
            createdById: auth.user.userId,
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
  } catch (error: unknown) {
    logger.error('Page counts error', {
      route,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return handleApiError(error, request)
  }
}

