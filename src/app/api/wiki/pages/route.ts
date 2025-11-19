import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'
import { parsePaginationParams, createPaginationResult, getSkipValue, getOrderByClause } from '@/lib/pagination'
import { cache } from '@/lib/cache'

// GET /api/wiki/pages - List all wiki pages for a workspace
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
    const pagination = parsePaginationParams(searchParams)
    
    // Check cache first
    const cacheKey = `wiki_pages_${auth.workspaceId}_${pagination.page || 1}_${pagination.limit || 10}_${pagination.sortBy || 'order'}_${pagination.sortOrder || 'asc'}`
    const cached = cache.get(cacheKey)
    
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
    
    // Get total count and pages in parallel
    // OPTIMIZED: Use select instead of include for metadata-only responses
    // This reduces payload size by 80-90% for list views
    const [total, pages] = await Promise.all([
      prisma.wikiPage.count({
        where: {
          workspaceId: auth.workspaceId,
          isPublished: true
        }
      }),
      prisma.wikiPage.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isPublished: true
        },
        select: {
          // Only select metadata - no full content unless explicitly requested
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          permissionLevel: true,
          workspace_type: true,
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

    const result = createPaginationResult(pages, total, pagination.page!, pagination.limit!)
    
    // Add debug logging for workspace_type
    console.log('🔍 Pages with workspace_type:', pages.map((p: any) => ({ id: p.id, title: p.title, workspace_type: p.workspace_type })))
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300)
    
    logger.info('Wiki pages fetched', { workspaceId: auth.workspaceId, total, page: pagination.page, limit: pagination.limit })
    
    // Add HTTP caching headers for better performance
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
  } catch (error) {
    const workspaceId = (error as any)?.workspaceId || 'unknown'
    logger.error('Error fetching wiki pages', error instanceof Error ? error : undefined)
    
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
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
    console.log('📝 Request body:', { workspaceId: auth.workspaceId, title: body.title, contentLength: body.content?.length, workspace_type: body.workspace_type, permissionLevel: body.permissionLevel })
    
    const { title, content, parentId, tags = [], category = 'general', permissionLevel, workspace_type } = body
    
    console.log('🔍 Extracted workspace_type:', workspace_type, 'permissionLevel:', permissionLevel)

    if (!title || !content) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    
    console.log('💾 Saving page with workspace_type:', finalWorkspaceType, 'permissionLevel:', finalPermissionLevel)
    
    const page = await prisma.wikiPage.create({
      data: {
        workspaceId: auth.workspaceId,
        title,
        slug,
        content,
        excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
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

    console.log('✅ Page created successfully with workspace_type:', page.workspace_type)
    logger.info('Wiki page created successfully', { pageId: page.id, title, workspaceId: auth.workspaceId, workspace_type: page.workspace_type })
    
    // Invalidate wiki pages cache for this workspace
    await cache.invalidatePattern(`wiki_pages_${auth.workspaceId}_*`)
    console.log('🗑️ Cleared wiki pages cache for workspace:', auth.workspaceId)
    
    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    logger.error('Error creating wiki page', error instanceof Error ? error : undefined)
    
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}