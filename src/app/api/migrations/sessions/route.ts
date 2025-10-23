import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

// GET /api/migrations/sessions - Get all migration sessions
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

    // Get migration sessions for the workspace
    const sessions = await prisma.migration.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching migration sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch migration sessions' },
      { status: 500 }
    )
  }
}

// POST /api/migrations/sessions - Create a new migration session
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { platform, items } = body

    if (!platform || !items) {
      return NextResponse.json({ 
        error: 'Missing required fields: platform, items' 
      }, { status: 400 })
    }

    // Create migration session
    const migrationSession = await prisma.migration.create({
      data: {
        workspaceId: auth.workspaceId,
        platform: platform.toUpperCase(),
        status: 'preview',
        totalItems: items.length,
        approvedItems: 0,
        rejectedItems: 0,
        items: items,
        userId: auth.user.userId
      }
    })

    return NextResponse.json({
      id: migrationSession.id,
      platform: platform,
      status: 'preview',
      totalItems: items.length,
      approvedItems: 0,
      rejectedItems: 0,
      createdAt: migrationSession.createdAt.toISOString(),
      items: items
    })

  } catch (error) {
    console.error('Error creating migration session:', error)
    return NextResponse.json({ 
      error: 'Failed to create migration session' 
    }, { status: 500 })
  }
}