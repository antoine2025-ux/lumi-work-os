import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-utils'

// POST /api/wiki/favorites - Add a page to favorites
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    // Check if page exists
    const page = await prisma.wikiPage.findFirst({
      where: {
        id: pageId
      }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Check if already favorited
    const existingFavorite = await prisma.wikiFavorite.findUnique({
      where: {
        page_id_user_id: {
          user_id: auth.user.id,
          page_id: pageId
        }
      }
    })

    if (existingFavorite) {
      return NextResponse.json({ error: 'Page already in favorites' }, { status: 409 })
    }

    // Add to favorites
    const favorite = await prisma.wikiFavorite.create({
      data: {
        user_id: auth.user.id,
        page_id: pageId
      },
      include: {
        wiki_pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            category: true,
            tags: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      favorite,
      message: 'Page added to favorites' 
    })

  } catch (error) {
    console.error('Error adding to favorites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/wiki/favorites - Remove a page from favorites
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    // Remove from favorites
    const deleted = await prisma.wikiFavorite.deleteMany({
      where: {
        user_id: auth.user.id,
        page_id: pageId
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Page not in favorites' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Page removed from favorites' 
    })

  } catch (error) {
    console.error('Error removing from favorites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/wiki/favorites - Get user's favorite pages
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/wiki/favorites - Starting request')
    
    const auth = await getAuthenticatedUser()
    console.log('🔐 Authenticated user:', auth.user.email, auth.isDevelopment ? '(dev mode)' : '(production)')

    const favorites = await prisma.wikiFavorite.findMany({
      where: {
        user_id: auth.user.id
      },
      include: {
        wiki_pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            category: true,
            tags: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    console.log('📋 Found favorites:', favorites.length)

    return NextResponse.json({ 
      success: true, 
      favorites: favorites.map(fav => ({
        id: fav.id,
        createdAt: fav.created_at,
        page: fav.wiki_pages
      }))
    })

  } catch (error) {
    console.error('💥 Error fetching favorites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
