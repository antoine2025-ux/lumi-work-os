import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { parsePaginationParams, createPaginationResult, getSkipValue, getOrderByClause } from '@/lib/pagination'
import { cache } from '@/lib/cache'

// GET /api/wiki/pages - List all wiki pages for a workspace
export async function GET(request: NextRequest) {
  let workspaceId = 'workspace-1' // Default value
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    const pagination = parsePaginationParams(searchParams)
    
    // Check cache first
    const cacheKey = cache.generateKey('wiki_pages', { workspaceId, ...pagination })
    const cached = cache.get(cacheKey)
    
    if (cached) {
      logger.debug('Returning cached wiki pages', { workspaceId, ...pagination })
      return NextResponse.json(cached)
    }
    
    const skip = getSkipValue(pagination.page!, pagination.limit!)
    const orderBy = getOrderByClause(pagination.sortBy, pagination.sortOrder)
    
    // Get total count and pages in parallel
    const [total, pages] = await Promise.all([
      prisma.wikiPage.count({
        where: {
          workspaceId,
          isPublished: true
        }
      }),
      prisma.wikiPage.findMany({
        where: {
          workspaceId,
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
    
    logger.info('Wiki pages fetched', { workspaceId, total, page: pagination.page, limit: pagination.limit })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error fetching wiki pages', { workspaceId }, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

// POST /api/wiki/pages - Create a new wiki page
export async function POST(request: NextRequest) {
  let workspaceId = 'workspace-1'
  let title = 'Unknown'
  try {
    logger.info('Creating new wiki page')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      logger.logAuth('unauthorized', { operation: 'create_wiki_page' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('User authenticated for wiki page creation', { userEmail: session.user.email })
    const body = await request.json()
    console.log('📝 Request body:', { workspaceId: body.workspaceId, title: body.title, contentLength: body.content?.length })
    
    const { workspaceId: bodyWorkspaceId, title: bodyTitle, content, parentId, tags = [], category = 'general' } = body
    workspaceId = bodyWorkspaceId
    title = bodyTitle

    if (!workspaceId || !title || !content) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user ID from session
    let user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      // Create user if it doesn't exist (shouldn't happen with Prisma adapter)
      user = await prisma.user.create({
        data: {
          email: session.user.email!,
          name: session.user.name || 'Unknown User'
        }
      })
      console.log('👤 Created user:', user.email)
    } else {
      console.log('👤 User found:', user.email)
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
          workspaceId,
          slug
        }
      }
    })

    if (existingPage) {
      console.log('❌ Page with this title already exists')
      return NextResponse.json({ error: 'Page with this title already exists' }, { status: 409 })
    }

    console.log('💾 Creating page in database...')
    // Create the page
    const page = await prisma.wikiPage.create({
      data: {
        workspaceId,
        title,
        slug,
        content,
        excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        parentId: parentId || null,
        tags,
        category,
        createdById: user.id
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
        }
      }
    })

    console.log('✅ Page created successfully:', page.id)

    // Create initial version
    await prisma.wikiVersion.create({
      data: {
        pageId: page.id,
        content,
        version: 1,
        createdById: user.id
      }
    })

    logger.info('Wiki page created successfully', { pageId: page.id, title, workspaceId })
    
    // Invalidate cache for this workspace
    cache.delete(`wiki_pages:workspaceId:${workspaceId}`)
    
    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    logger.error('Error creating wiki page', { workspaceId, title }, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
