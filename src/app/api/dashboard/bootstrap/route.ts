import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'
import { getTodayWindow } from '@/lib/datetime'
import { DashboardBootstrap } from '@/lib/types/dashboard-bootstrap'
import { handleApiError } from '@/lib/api-errors'

/**
 * GET /api/dashboard/bootstrap
 * 
 * Single endpoint that fetches all data needed for initial dashboard load.
 * 
 * ⚠️ PERFORMANCE GUARDRAILS - DO NOT VIOLATE:
 * 
 * 1. STRICT LIMITS (enforced via constants below):
 *    - Projects: MAX 10 (dashboard preview only)
 *    - Wiki pages: MAX 4 (recent pages preview)
 *    - Todos: MAX 50 (today's todos only)
 *    - NEVER increase these limits without performance review
 * 
 * 2. MINIMAL FIELD SELECTION (MANDATORY):
 *    - ALWAYS use `select: { ... }` with explicit fields
 *    - NEVER use `include: { ... }` (loads full relations)
 *    - NEVER select `content`, `body`, `html` fields (too large)
 *    - NEVER select full task lists (use `_count` instead)
 * 
 * 3. WHAT MUST NEVER BE ADDED HERE:
 *    ❌ Full page content/body (use /api/wiki/pages/[id] for full content)
 *    ❌ Full task lists (use /api/projects/[id]/tasks for tasks)
 *    ❌ Full epic lists (use /api/projects/[id]/epics for epics)
 *    ❌ Heavy joins with nested includes
 *    ❌ Unbounded queries (always use `take: N`)
 *    ❌ Full user objects (use minimal user fields if needed)
 *    ❌ Comments, attachments, or other large nested data
 * 
 * 4. QUERY PATTERNS:
 *    ✅ Use `_count: { select: { tasks: true } }` for counts
 *    ✅ Use `select: { id, name, ... }` for minimal fields
 *    ✅ Use `take: N` for all queries
 *    ✅ Use `orderBy` for deterministic ordering
 *    ❌ Never use `include` (loads full relations)
 *    ❌ Never omit `select` (loads all fields)
 * 
 * Optimizations:
 * - Single auth resolution (reused across all queries)
 * - Parallel DB queries (Promise.all)
 * - Minimal field selection (only what's needed for initial render)
 * - Strict result limits (enforced via constants)
 */

// ⚠️ PERFORMANCE GUARDRAILS - DO NOT MODIFY WITHOUT REVIEW
const MAX_PROJECTS = 10
const MAX_WIKI_PAGES = 4
const MAX_TODOS = 50
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
      // 1. Projects (minimal fields, strict limit)
      prisma.project.findMany({
        where: {
          workspaceId: auth.workspaceId
          // NOTE: projectSpaceId/projectSpace visibility filtering removed - fields do not exist on Project model
        },
        // ⚠️ GUARDRAIL: Must use select (never include), minimal fields only
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          priority: true,
          color: true,
          updatedAt: true,
          createdAt: true,
          // Use _count for task count (never load full task list)
          _count: {
            select: {
              tasks: true
            }
          }
        },
        // ⚠️ GUARDRAIL: Strict limit enforced
        take: MAX_PROJECTS,
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      
      // 2. Wiki pages (minimal fields, strict limit)
      prisma.wikiPage.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isPublished: true
        },
        // ⚠️ GUARDRAIL: Must use select (never include), NO content/body fields
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true, // Excerpt only, never full content
          category: true,
          updatedAt: true,
          createdAt: true
          // ❌ NEVER add: content, body, html, or other large text fields
        },
        // ⚠️ GUARDRAIL: Strict limit enforced
        take: MAX_WIKI_PAGES,
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
      
      // 4. Today's todos (minimal fields, strict limit)
      (async () => {
        const todayWindow = getTodayWindow(userTimezone)
        return prisma.todo.findMany({
          where: {
            workspaceId: auth.workspaceId,
            assignedToId: auth.user.userId,
            status: 'OPEN',
            dueAt: { lte: todayWindow.end }
          },
          // ⚠️ GUARDRAIL: Must use select (never include), minimal fields only
          select: {
            id: true,
            title: true,
            status: true,
            dueAt: true,
            priority: true,
            createdAt: true
            // ❌ NEVER add: description, comments, attachments, or other large fields
          },
          orderBy: [
            { dueAt: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          // ⚠️ GUARDRAIL: Strict limit enforced
          take: MAX_TODOS
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
    
    // Log slow requests (threshold: 1 second)
    if (totalDurationMs > 1000) {
      logger.warn('Dashboard bootstrap (slow)', {
        ...baseContext,
        route,
        totalDurationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100,
        pageCountsDurationMs: Math.round(pageCountsDurationMs * 100) / 100,
        projectCount: projects.length,
        wikiPageCount: wikiPages.length,
        todoCount: todos.length
      })
    }
    
    // Validate limits weren't exceeded (safety check)
    if (projects.length > MAX_PROJECTS) {
      logger.error('Bootstrap limit violation: projects', {
        ...baseContext,
        route,
        limit: MAX_PROJECTS,
        actual: projects.length
      })
    }
    if (wikiPages.length > MAX_WIKI_PAGES) {
      logger.error('Bootstrap limit violation: wikiPages', {
        ...baseContext,
        route,
        limit: MAX_WIKI_PAGES,
        actual: wikiPages.length
      })
    }
    if (todos.length > MAX_TODOS) {
      logger.error('Bootstrap limit violation: todos', {
        ...baseContext,
        route,
        limit: MAX_TODOS,
        actual: todos.length
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
    
    return handleApiError(error, request)
  }
}

