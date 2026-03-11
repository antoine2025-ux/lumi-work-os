import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertWorkspaceAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'

// POST /api/wiki/pages/[id]/favorite - Add page to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER'])
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params

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
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// DELETE /api/wiki/pages/[id]/favorite - Remove page from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER'])
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params

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
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

