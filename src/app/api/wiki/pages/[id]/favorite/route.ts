import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/wiki/pages/[id]/favorite - Add page to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
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

    // Check if page exists
    const page = await prisma.wikiPage.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Add to favorites by setting is_featured to true
    const updatedPage = await prisma.wikiPage.update({
      where: { id: resolvedParams.id },
      data: {
        is_featured: true
      }
    })

    return NextResponse.json({ message: 'Page added to favorites', page: updatedPage })
  } catch (error) {
    console.error('Error adding page to favorites:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// DELETE /api/wiki/pages/[id]/favorite - Remove page from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
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

    // Check if page exists
    const page = await prisma.wikiPage.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Remove from favorites by setting is_featured to false
    const updatedPage = await prisma.wikiPage.update({
      where: { id: resolvedParams.id },
      data: {
        is_featured: false
      }
    })

    return NextResponse.json({ message: 'Page removed from favorites', page: updatedPage })
  } catch (error) {
    console.error('Error removing page from favorites:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

