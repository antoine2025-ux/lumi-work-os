import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/wiki/favorites - Get all favorite pages
export async function GET(request: NextRequest) {
  try {
    // For now, create a mock user - in production this would come from auth
    const mockUser = {
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User'
    }

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { email: mockUser.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        }
      })
    }

    // Get favorite pages for the user
    const favoritePages = await prisma.wikiPage.findMany({
      where: {
        is_featured: true, // Using is_featured as a proxy for favorites for now
        isPublished: true
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform to match RecentPage interface
    const formattedPages = favoritePages.map(page => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      author: page.createdBy?.name || 'Unknown',
      updatedAt: page.updatedAt.toISOString(),
      viewCount: page.view_count || 0,
      tags: page.tags || [],
      permissionLevel: page.permissionLevel,
      workspace_type: page.workspace_type || 'team'
    }))

    return NextResponse.json(formattedPages)
  } catch (error) {
    console.error('Error fetching favorite pages:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}