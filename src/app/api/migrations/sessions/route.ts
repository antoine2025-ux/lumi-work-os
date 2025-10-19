import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/migrations/sessions - Get all migration sessions
export async function GET(request: NextRequest) {
  try {
    // Temporarily bypass authentication for testing
    console.log('=== MIGRATION SESSIONS API CALLED ===')
    
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Get user from database - use a default user for now
    let user = await prisma.user.findFirst()
    
    if (!user) {
      // Create a default user if none exists
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          image: null
        }
      })
    }

    // Get or create a default workspace
    let workspace = await prisma.workspace.findFirst()
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Default Workspace',
          slug: 'default-workspace',
          description: 'Default workspace for migrations',
          ownerId: user.id
        }
      })
    }

    // Get migration sessions (stored in integrations table)
    const sessions = await prisma.integration.findMany({
      where: {
        workspaceId: workspace.id,
        type: {
          in: ['SLITE', 'CLICKUP', 'NOTION', 'CONFLUENCE']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to migration session format
    const migrationSessions = sessions.map(session => ({
      id: session.id,
      platform: session.type.toLowerCase(),
      status: session.config?.status || 'preview',
      totalItems: session.config?.totalItems || 0,
      approvedItems: session.config?.approvedItems || 0,
      rejectedItems: session.config?.rejectedItems || 0,
      createdAt: session.createdAt.toISOString(),
      items: session.config?.items || []
    }))

    return NextResponse.json(migrationSessions)

  } catch (error) {
    console.error('Error fetching migration sessions:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch migration sessions' 
    }, { status: 500 })
  }
}

// POST /api/migrations/sessions - Create a new migration session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, items } = body

    if (!platform || !items) {
      return NextResponse.json({ 
        error: 'Missing required fields: platform, items' 
      }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create migration session
    const migrationSession = await prisma.integration.create({
      data: {
        workspaceId: 'cmgl0f0wa00038otlodbw5jhn',
        type: platform.toUpperCase() as any,
        name: `${platform} Migration Session`,
        config: {
          status: 'preview',
          totalItems: items.length,
          approvedItems: 0,
          rejectedItems: 0,
          items: items
        },
        isActive: true
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
