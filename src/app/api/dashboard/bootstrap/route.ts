import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'
import { getTodayWindow } from '@/lib/datetime'
import { DashboardBootstrap } from '@/lib/types/dashboard-bootstrap'

/**
 * GET /api/dashboard/bootstrap
 * 
 * Single endpoint that fetches all data needed for initial dashboard load.
 * Optimizations:
 * - Single auth resolution (reused across all queries)
 * - Parallel DB queries (Promise.all)
 * - Minimal field selection (only what's needed for initial render)
 * - Limited results (10 projects, 4 wiki pages)
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const route = '/api/dashboard/bootstrap'
  const baseContext = await buildLogContextFromRequest(request)
  
  try {
    // Single auth resolution
    const authStart = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStart
    
    // Assert access once
    const accessStart = performance.now()
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']
    })
    const accessDurationMs = performance.now() - accessStart
    
    // Set workspace context
    setWorkspaceContext(auth.workspaceId)
    
    // Get user timezone for todo filtering (needed before parallel queries)
    const userTimezoneStart = performance.now()
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { timezone: true }
    })
    const userTimezone = user?.timezone || null
    const userTimezoneDurationMs = performance.now() - userTimezoneStart
    
    // Parallel DB queries - all execute simultaneously
    const dbStart = performance.now()
    const [projects, wikiPages, workspaces, todos] = await Promise.all([
      // 1. Projects (minimal fields, limit 10 for dashboard)
      prisma.project.findMany({
        where: {
          workspaceId: auth.workspaceId,
          // Apply same visibility filtering as /api/projects
          OR: [
            { projectSpaceId: null },
            {
              projectSpace: {
                visibility: 'PUBLIC'
              }
            },
            {
              projectSpace: {
                visibility: 'TARGETED',
                members: {
                  some: {
                    userId: auth.user.userId
                  }
                }
              }
            },
            { createdById: auth.user.userId },
            { ownerId: auth.user.userId }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          priority: true,
          color: true,
          updatedAt: true,
          createdAt: true,
          _count: {
            select: {
              tasks: true
            }
          }
        },
        take: 10,
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      
      // 2. Wiki pages (minimal fields, limit 4 for dashboard)
      prisma.wikiPage.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isPublished: true
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          updatedAt: true,
          createdAt: true
        },
        take: 4,
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      
      // 3. Workspaces (for page counts)
      prisma.wiki_workspaces.findMany({
        where: {
          workspace_id: auth.workspaceId
        },
        select: {
          id: true,
          type: true,
          name: true
        }
      }),
      
      // 4. Today's todos (minimal fields)
      (async () => {
        const todayWindow = getTodayWindow(userTimezone)
        return prisma.todo.findMany({
          where: {
            workspaceId: auth.workspaceId,
            assignedToId: auth.user.userId,
            status: 'OPEN',
            dueAt: { lte: todayWindow.end }
          },
          select: {
            id: true,
            title: true,
            status: true,
            dueAt: true,
            priority: true,
            createdAt: true
          },
          orderBy: [
            { dueAt: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          take: 50 // Limit for dashboard
        })
      })()
    ])
    const dbDurationMs = performance.now() - dbStart
    
    // Build page counts (reuse logic from /api/wiki/page-counts)
    const pageCountsStart = performance.now()
    const pageCounts: Record<string, number> = {}
    
    for (const workspace of workspaces) {
      if (!workspace.id) continue
      
      const workspaceType = workspace.type || null
      let count = 0
      
      if (workspaceType === 'personal') {
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
        count = await prisma.wikiPage.count({
          where: {
            workspaceId: auth.workspaceId,
            isPublished: true,
            workspace_type: workspace.id,
            NOT: {
              OR: [
                { workspace_type: 'team' },
                { workspace_type: 'personal' }
              ]
            }
          }
        })
      }
      
      pageCounts[workspace.id] = count
    }
    const pageCountsDurationMs = performance.now() - pageCountsStart
    
    // Get workspace name
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: { id: true, name: true }
    })
    
    // Transform data to match DashboardBootstrap type
    const bootstrap: DashboardBootstrap = {
      workspace: {
        id: auth.workspaceId,
        name: workspace?.name
      },
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        color: p.color,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        taskCount: p._count.tasks
      })),
      wikiPages: wikiPages.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        category: p.category
      })),
      pageCounts,
      todos: todos.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status as 'OPEN' | 'DONE',
        dueAt: t.dueAt?.toISOString() || null,
        priority: t.priority,
        createdAt: t.createdAt.toISOString()
      }))
    }
    
    const totalDurationMs = performance.now() - startTime
    
    // Log performance metrics
    logger.info('Dashboard bootstrap completed', {
      ...baseContext,
      route,
      workspaceId: auth.workspaceId,
      projectCount: projects.length,
      wikiPageCount: wikiPages.length,
      todoCount: todos.length,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      accessDurationMs: Math.round(accessDurationMs * 100) / 100,
      userTimezoneDurationMs: Math.round(userTimezoneDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      pageCountsDurationMs: Math.round(pageCountsDurationMs * 100) / 100,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    })
    
    // Log slow requests
    if (totalDurationMs > 1000) {
      logger.warn('Dashboard bootstrap (slow)', {
        ...baseContext,
        route,
        totalDurationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100
      })
    }
    
    const response = NextResponse.json(bootstrap)
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
    
  } catch (error: any) {
    const totalDurationMs = performance.now() - startTime
    
    logger.error('Dashboard bootstrap error', {
      ...baseContext,
      route,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    }, error)
    
    // Handle auth errors
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

