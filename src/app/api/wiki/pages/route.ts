import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/wiki/pages - List all wiki pages for a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    
    const pages = await prisma.wikiPage.findMany({
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
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(pages)
  } catch (error) {
    console.error('Error fetching wiki pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/wiki/pages - Create a new wiki page
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API Route called - checking session...')
    const session = await getServerSession(authOptions)
    console.log('📋 Session data:', session ? 'Found session' : 'No session')
    
    if (!session?.user?.email) {
      console.log('❌ Unauthorized - no session or email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', session.user.email)
    const body = await request.json()
    console.log('📝 Request body:', { workspaceId: body.workspaceId, title: body.title, contentLength: body.content?.length })
    
    const { workspaceId, title, content, parentId, tags = [], category = 'general' } = body

    if (!workspaceId || !title || !content) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('❌ User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('👤 User found:', user.email)

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

    console.log('📚 Version created successfully')
    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    console.error('💥 Error creating wiki page:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
