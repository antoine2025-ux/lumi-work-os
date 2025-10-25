import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// Optimized projects API with caching
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Generate cache key
    const cacheKey = cache.generateKey(
      CACHE_KEYS.PROJECTS,
      auth.workspaceId,
      status || 'all',
      limit.toString(),
      offset.toString()
    )

    // Try cache first, then database
    const projects = await cache.cacheWorkspaceData(
      cacheKey,
      auth.workspaceId,
      async () => {
        const where: any = { workspaceId: auth.workspaceId }
        if (status) where.status = status

        return await prisma.project.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            color: true,
            createdAt: true,
            updatedAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            _count: {
              select: {
                tasks: true,
                members: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        })
      },
      CACHE_TTL.MEDIUM
    )

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch projects' 
    }, { status: 500 })
  }
}
