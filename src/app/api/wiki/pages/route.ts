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
    const cacheKey = cache.generateKey('wiki_pages', { workspaceId: auth.workspaceId, ...pagination })
    const cached = cache.get(cacheKey)
    
    if (cached) {
      logger.debug('Returning cached wiki pages', { workspaceId: auth.workspaceId, ...pagination })
      return NextResponse.json(cached)
    }
    
    const skip = getSkipValue(pagination.page!, pagination.limit!)
    const orderBy = getOrderByClause(pagination.sortBy, pagination.sortOrder)
    
    // Get total count and pages in parallel
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
        include: {
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
          children: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true
            },
            orderBy: {
              order: 'asc'
            }
          },
          _count: {
            select: {
              comments: true,
              versions: true
            }
          }
        },
        orderBy: orderBy || { order: 'asc' },
        skip,
        take: pagination.limit
      })
    ])

    const result = createPaginationResult(pages, total, pagination.page!, pagination.limit!)
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300)
    
    logger.info('Wiki pages fetched', { workspaceId: auth.workspaceId, total, page: pagination.page, limit: pagination.limit })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error fetching wiki pages', { workspaceId: auth.workspaceId }, error instanceof Error ? error : undefined)
    
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
    console.log('📝 Request body:', { workspaceId: auth.workspaceId, title: body.title, contentLength: body.content?.length })
    
    const { title, content, parentId, tags = [], category = 'general' } = body

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

    // Create the wiki page
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
        permissionLevel: 'team',
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

    logger.info('Wiki page created successfully', { pageId: page.id, title, workspaceId: auth.workspaceId })
    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    logger.error('Error creating wiki page', { workspaceId: auth.workspaceId }, error instanceof Error ? error : undefined)
    
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