import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertWorkspaceAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// GET /api/wiki/pages/[id]/versions - Get version history for a wiki page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const auth = await getUnifiedAuth(request)
    
    // Verify user has workspace access (VIEWER+ can view version history)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['VIEWER'])
    setWorkspaceContext(auth.workspaceId)
    
    // Verify the page belongs to the user's workspace
    const page = await prisma.wikiPage.findUnique({
      where: { id: resolvedParams.id },
      select: { workspaceId: true }
    })
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    
    if (page.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const versions = await prisma.wikiVersion.findMany({
      where: {
        pageId: resolvedParams.id
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
        version: 'desc'
      }
    })

    return NextResponse.json(versions)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
