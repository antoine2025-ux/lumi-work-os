import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertWorkspaceAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// GET /api/wiki/favorites/check - Check if a page is favorited
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER'])
    setWorkspaceContext(auth.workspaceId)
    
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    const favorite = await prisma.wikiFavorite.findUnique({
      where: {
        page_id_user_id: {
          user_id: auth.user.userId,
          page_id: pageId
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null
    })

  } catch (error) {
    return handleApiError(error)
  }
}
