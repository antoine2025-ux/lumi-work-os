import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'
import { parsePaginationParams, createPaginationResult, getSkipValue, getOrderByClause } from '@/lib/pagination'
import { cache } from '@/lib/cache'
import { handleApiError } from '@/lib/api-errors'
import { emitEvent } from '@/lib/events/emit'
import { ACTIVITY_EVENTS } from '@/lib/events/activityEvents'
import { WikiPageCreateSchema } from '@/lib/validations/wiki'

// GET /api/wiki/pages - List all wiki pages for a workspace
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const route = '/api/wiki/pages'
  
  try {
    const authStart = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStart
    
    // Assert workspace access
    const accessStart = performance.now()
    // VIEWER and above can list wiki pages
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER']
    })
    const accessDurationMs = performance.now() - accessStart

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    // RLS defense-in-depth: set app.user_id so RLS policies pass
    await prisma.$executeRaw`SELECT set_config('app.user_id', ${auth.user.userId}, true)`

    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    // TODO Sprint 4+: add ?spaceId= filter once pages are migrated to space-based nav
    
    // OPTIMIZED: Check cache first (non-blocking with timeout)
    // SECURITY: Cache key includes userId because personal page visibility is per-user
    const cacheKey = `wiki_pages_${auth.workspaceId}_${auth.user.userId}_${pagination.page || 1}_${pagination.limit || 10}_${pagination.sortBy || 'order'}_${pagination.sortOrder || 'asc'}`
    const cachePromise = cache.get(cacheKey)
    const raceTimeout = 200 // Increased from 50ms to allow slower Redis responses
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), raceTimeout))
    
    const cached = await Promise.race([cachePromise, timeoutPromise]) as any
    
    if (cached) {
      logger.debug('Returning cached wiki pages', { workspaceId: auth.workspaceId, ...pagination })
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
      response.headers.set('X-Cache', 'HIT')
      return response
    }
    
    const skip = getSkipValue(pagination.page!, pagination.limit!)
    const orderBy = getOrderByClause(pagination.sortBy, pagination.sortOrder)
    
    // Check if we need full content or just metadata
    const includeContent = searchParams.get('includeContent') === 'true'
    
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
    
    // Build where clause
    // SECURITY: Filter by accessible wiki workspaces. PRIVATE wiki-xxx pages only visible to members.
    const baseWhere: Record<string, unknown> = {
      workspaceId: auth.workspaceId,
      isPublished: true,
      OR: [
        // Custom wiki workspaces - only if user has access
        ...(accessibleIds.length > 0 ? [{ workspace_type: { in: accessibleIds } }] : []),
        // Team pages
        { workspace_type: 'team' },
        { workspace_type: null },
        { workspace_type: '' },
        // Personal pages - only creator
        { workspace_type: 'personal', createdById: auth.user.userId },
        {
          workspace_type: { startsWith: 'personal-space-' },
          createdById: auth.user.userId,
        },
      ],
    }
    
    // Get total count and pages in parallel
    // OPTIMIZED: Use select instead of include for metadata-only responses
    // This reduces payload size by 80-90% for list views
    const dbStart = performance.now()
    const [total, pages] = await Promise.all([
      prisma.wikiPage.count({
        where: baseWhere
      }),
      (prisma.wikiPage.findMany as Function)({
        where: baseWhere,
        select: {
          // Only select metadata - no full content unless explicitly requested
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          permissionLevel: true,
          workspace_type: true,
          // NOTE: spaceId removed - field does not exist on WikiPage model
          category: true,
          tags: true,
          updatedAt: true,
          createdAt: true,
          order: true,
          parentId: true,
          isPublished: true,
          view_count: true,
          // Only include content if explicitly requested
          ...(includeContent ? { content: true } : {}),
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
          // Only load children metadata (not full content)
          children: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              excerpt: true,
              updatedAt: true
            },
            orderBy: {
              order: 'asc'
            },
            take: 10 // Limit children to prevent huge payloads
          },
          _count: {
            select: {
              comments: true,
              versions: true,
              children: true
            }
          }
        },
        orderBy: orderBy || { order: 'asc' },
        skip,
        take: Math.min(pagination.limit || 10, 50) // Cap at 50 to prevent huge responses
      })
    ])
    const dbDurationMs = performance.now() - dbStart

    const result = createPaginationResult(pages, total, pagination.page!, pagination.limit!)
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300)
    
    const totalDurationMs = performance.now() - startTime
    logger.info('Wiki pages fetched', { 
      route,
      workspaceId: auth.workspaceId, 
      total, 
      page: pagination.page, 
      limit: pagination.limit,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      accessDurationMs: Math.round(accessDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    })
    
    // Add HTTP caching headers for better performance
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
  } catch (error) {
    const totalDurationMs = performance.now() - startTime
    logger.error('Error fetching wiki pages', {
      route,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100
    }, error instanceof Error ? error : undefined)
    
    return handleApiError(error, request)
  }
}

// POST /api/wiki/pages - Create a new wiki page
export async function POST(request: NextRequest) {
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

    logger.info('Creating new wiki page')
    const body = WikiPageCreateSchema.parse(await request.json())
    
    const { title, content: _content, contentJson, parentId, tags = [], category = 'general', permissionLevel, workspace_type, spaceId, type: pageType } = body
    
    // Enforce JSON format for all new pages created via POST /api/wiki/pages
    // This ensures all new pages use the TipTap editor (Stage 1 requirement)
    // Internal flows (AI assistant, wiki-layout) should also send contentJson + contentFormat='JSON'
    // Legacy HTML creation is not supported for new pages (existing HTML pages remain unchanged)
    const finalContentFormat: 'HTML' | 'JSON' = 'JSON'
    
    // Import constants and validation
    const { EMPTY_TIPTAP_DOC } = await import('@/lib/wiki/constants')
    const { isValidProseMirrorJSON } = await import('@/lib/wiki/text-extract')
    
    // For JSON format, use provided contentJson or default to empty doc
    let finalContentJson = contentJson
    if (!finalContentJson || !isValidProseMirrorJSON(finalContentJson)) {
      finalContentJson = EMPTY_TIPTAP_DOC
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists in workspace
    const existingPage = await prisma.wikiPage.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId: auth.workspaceId,
          slug
        }
      }
    })

    if (existingPage) {
      return NextResponse.json({ 
        error: 'A page with this title already exists' 
      }, { status: 409 })
    }

    // Resolve space when spaceId provided (for type and workspace_type inference)
    const space = spaceId
      ? await prisma.space.findUnique({
          where: { id: spaceId },
          select: { type: true, isPersonal: true, slug: true },
        })
      : null

    // Determine WikiPage type from explicit pageType or space
    let finalPageType: 'TEAM_DOC' | 'COMPANY_WIKI' | 'PERSONAL_NOTE' | 'PROJECT_DOC' | null = null
    if (pageType) {
      finalPageType = pageType
    } else if (space) {
      if (space.isPersonal) finalPageType = 'PERSONAL_NOTE'
      else if (space.type === 'WIKI') finalPageType = 'COMPANY_WIKI'
      else finalPageType = 'TEAM_DOC'
    }

    // Determine workspace_type with strict validation
    // Priority: explicit workspace_type > spaceId > permissionLevel > default
    let finalWorkspaceType: string
    let finalPermissionLevel: string

    if (workspace_type) {
      finalWorkspaceType = workspace_type
      finalPermissionLevel =
        permissionLevel && (permissionLevel === 'personal' || permissionLevel === 'team')
          ? permissionLevel
          : workspace_type === 'personal'
            ? 'personal'
            : 'team'
    } else if (space) {
      if (space.isPersonal) {
        finalWorkspaceType = 'personal'
        finalPermissionLevel = 'personal'
      } else if (space.type === 'WIKI') {
        finalWorkspaceType = 'company-wiki'
        finalPermissionLevel = 'team'
      } else {
        finalWorkspaceType = space.slug ?? 'team'
        finalPermissionLevel = permissionLevel || 'team'
      }
    } else if (permissionLevel === 'personal') {
      // No workspace_type but permissionLevel is 'personal' - infer personal workspace
      finalWorkspaceType = 'personal'
      finalPermissionLevel = 'personal'
    } else {
      // Default fallback
      finalWorkspaceType = 'team'
      finalPermissionLevel = permissionLevel || 'team'
    }
    
    // Import text extraction utility
    const { extractTextFromProseMirror } = await import('@/lib/wiki/text-extract')
    
    // Extract text content from JSON
    const textContent = extractTextFromProseMirror(finalContentJson)
    const excerpt = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '')

    // RLS on wiki_pages requires app.user_id to be set for INSERT. Run create inside a transaction
    // that sets the session variable so the policy has_workspace_access(workspaceId, app.user_id) passes.
    const page = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${auth.user.userId}, true)`
      return tx.wikiPage.create({
        data: {
          workspaceId: auth.workspaceId,
          title,
          slug,
          content: '', // Empty string for JSON pages (backward compatibility)
          contentJson: finalContentJson as object,
          contentFormat: finalContentFormat,
          textContent,
          excerpt,
          parentId: parentId || null,
          tags,
          category,
          permissionLevel: finalPermissionLevel,
          workspace_type: finalWorkspaceType,
          spaceId: spaceId ?? null,
          type: finalPageType,
          createdById: auth.user.userId
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    })

    logger.info('Wiki page created successfully', { pageId: page.id, title, workspaceId: auth.workspaceId, workspace_type: page.workspace_type })

    // Link orphan attachments to this page when their URLs appear in content
    const { extractUploadUrlsFromContent, linkAttachmentsToPage } = await import('@/lib/wiki/attachments')
    const urls = extractUploadUrlsFromContent(finalContentJson)
    await linkAttachmentsToPage(auth.workspaceId, page.id, urls)
    
    // Emit activity event
    emitEvent(ACTIVITY_EVENTS.WIKI_PAGE_CREATED, {
      workspaceId: auth.workspaceId,
      userId: auth.user.userId,
      wikiPageId: page.id,
      timestamp: new Date()
    }).catch((err) => 
      logger.error('Failed to emit wiki page created event', { pageId: page.id, error: err })
    )
    
    // Invalidate wiki pages cache for this workspace
    await cache.invalidatePattern(`wiki_pages_${auth.workspaceId}_*`)

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    const err = error instanceof Error ? error : error
    const message = err instanceof Error ? err.message : String(err)
    const name = err instanceof Error ? err.name : 'Error'
    logger.error('Error creating wiki page', { message, name, cause: err instanceof Error ? err.cause : undefined }, err instanceof Error ? err : undefined)
    if (process.env.NODE_ENV === 'development') {
      console.error('[POST /api/wiki/pages] Full error:', err)
      const prismaErr = err as { code?: string; meta?: unknown }
      if (prismaErr.code) console.error('[POST /api/wiki/pages] Prisma code:', prismaErr.code, prismaErr.meta)
    }
    return handleApiError(error, request)
  }
}