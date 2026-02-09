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
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })
    const accessDurationMs = performance.now() - accessStart

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    // NOTE: spaceId filter removed - spaceId field does not exist on WikiPage model
    
    // OPTIMIZED: Check cache first (non-blocking with timeout)
    const cacheKey = `wiki_pages_${auth.workspaceId}_all_${pagination.page || 1}_${pagination.limit || 10}_${pagination.sortBy || 'order'}_${pagination.sortOrder || 'asc'}`
    const cachePromise = cache.get(cacheKey)
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 50)) // 50ms timeout
    
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
    
    // Build where clause
    // NOTE: spaceId filtering removed - spaceId field does not exist on WikiPage model
    const baseWhere: any = {
      workspaceId: auth.workspaceId,
      isPublished: true
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
    
    // Add debug logging for workspace_type
    console.log('🔍 Pages with workspace_type:', pages.map((p: any) => ({ id: p.id, title: p.title, workspace_type: p.workspace_type })))
    
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
    const body = await request.json()
    console.log('📝 Request body:', { workspaceId: auth.workspaceId, title: body.title, contentFormat: body.contentFormat, workspace_type: body.workspace_type, permissionLevel: body.permissionLevel })
    
    const { title, content, contentJson, contentFormat, parentId, tags = [], category = 'general', permissionLevel, workspace_type } = body
    
    // Enforce JSON format for all new pages created via POST /api/wiki/pages
    // This ensures all new pages use the TipTap editor (Stage 1 requirement)
    // Internal flows (AI assistant, wiki-layout) should also send contentJson + contentFormat='JSON'
    // Legacy HTML creation is not supported for new pages (existing HTML pages remain unchanged)
    const finalContentFormat: 'HTML' | 'JSON' = 'JSON'
    
    console.log('🔍 Extracted workspace_type:', workspace_type, 'permissionLevel:', permissionLevel, 'contentFormat:', finalContentFormat)

    if (!title) {
      console.log('❌ Missing required field: title')
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Import constants and validation
    const { EMPTY_TIPTAP_DOC } = await import('@/lib/wiki/constants')
    const { isValidProseMirrorJSON } = await import('@/lib/wiki/text-extract')
    
    // For JSON format, use provided contentJson or default to empty doc
    let finalContentJson = contentJson
    if (!finalContentJson || !isValidProseMirrorJSON(finalContentJson)) {
      console.log('⚠️ Invalid or missing contentJson, using EMPTY_TIPTAP_DOC')
      finalContentJson = EMPTY_TIPTAP_DOC
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    console.log('🔗 Generated slug:', slug)

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

    // Determine workspace_type with strict validation
    // Priority: explicit workspace_type > permissionLevel > default to 'team'
    let finalWorkspaceType: string
    let finalPermissionLevel: string
    
    if (workspace_type) {
      // Explicit workspace_type provided - use it
      finalWorkspaceType = workspace_type
      // If permissionLevel matches workspace_type, use it; otherwise infer from workspace_type
      if (permissionLevel && (permissionLevel === 'personal' || permissionLevel === 'team')) {
        finalPermissionLevel = permissionLevel
      } else {
        finalPermissionLevel = workspace_type === 'personal' ? 'personal' : 'team'
      }
    } else if (permissionLevel === 'personal') {
      // No workspace_type but permissionLevel is 'personal' - infer personal workspace
      finalWorkspaceType = 'personal'
      finalPermissionLevel = 'personal'
      console.log('⚠️ No workspace_type provided, but permissionLevel is personal - setting workspace_type to personal')
    } else {
      // Default fallback - but log a warning
      finalWorkspaceType = 'team'
      finalPermissionLevel = permissionLevel || 'team'
      console.log('⚠️ No workspace_type provided, defaulting to team. This may cause incorrect classification.')
    }
    
    console.log('💾 Saving page with workspace_type:', finalWorkspaceType, 'permissionLevel:', finalPermissionLevel, 'contentFormat:', finalContentFormat)
    
    // NOTE: spaceId logic removed - spaceId field does not exist on WikiPage model
    
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

    console.log('✅ Page created successfully with workspace_type:', page.workspace_type)
    logger.info('Wiki page created successfully', { pageId: page.id, title, workspaceId: auth.workspaceId, workspace_type: page.workspace_type })
    
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
    console.log('🗑️ Cleared wiki pages cache for workspace:', auth.workspaceId)
    
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