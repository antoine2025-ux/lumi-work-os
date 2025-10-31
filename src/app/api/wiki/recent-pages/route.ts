import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

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
    const limit = parseInt(searchParams.get('limit') || '10')

    // Optimized query: Use select instead of include, don't load full content
    const recentPages = await prisma.wikiPage.findMany({
      where: {
        workspaceId: auth.workspaceId,
        isPublished: true
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true, // Use excerpt instead of full content
        permissionLevel: true,
        workspace_type: true,
        updatedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: Math.min(limit, 100) // Cap at 100 to prevent huge responses
    })

    const formattedPages = recentPages.map(page => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      updatedAt: page.updatedAt,
      author: page.createdBy?.name || 'Unknown',
      permissionLevel: page.permissionLevel,
      // Preserve null/undefined - don't default to 'team' as it breaks filtering
      // The frontend will handle null values for legacy pages
      workspace_type: page.workspace_type ?? null
    }))

    return NextResponse.json(formattedPages)
  } catch (error) {
    console.error('Error fetching recent pages:', error)
    return NextResponse.json({ error: 'Failed to fetch recent pages' }, { status: 500 })
  }
}