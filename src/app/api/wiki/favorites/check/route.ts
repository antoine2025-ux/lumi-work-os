import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'

// GET /api/wiki/favorites/check - Check if a page is favorited
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
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
    console.error('Error checking favorite status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
