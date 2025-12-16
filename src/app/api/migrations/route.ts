import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { MigrationService } from '@/lib/migrations/migration-service'
import { SliteAdapter } from '@/lib/migrations/adapters/slite-adapter'
import { ClickUpAdapter } from '@/lib/migrations/adapters/clickup-adapter'

// POST /api/migrations - Start a new migration
export async function POST(request: NextRequest) {
  try {
    console.log('=== MIGRATION API CALLED ===')
    
    // Get authenticated user with development fallback
    const auth = await getUnifiedAuth(request)
    console.log('🔐 Authenticated user:', auth.user.email, auth.isDevelopment ? '(dev mode)' : '(production)')
    
    const body = await request.json()
    const { platform, apiKey, workspaceId, additionalConfig } = body

    if (!platform || !apiKey || !workspaceId) {
      return NextResponse.json({ 
        error: 'Missing required fields: platform, apiKey, workspaceId' 
      }, { status: 400 })
    }

    // Use authenticated user instead of creating default user
    const userId = auth.user.id

    // Start migration based on platform
    let migrationItems = []
    
    switch (platform.toLowerCase()) {
      case 'slite':
        console.log('Starting Slite migration with API key:', apiKey.substring(0, 10) + '...')
        const sliteAdapter = new SliteAdapter(apiKey)
        const sliteDocs = await sliteAdapter.fetchAllDocuments()
        console.log('Fetched Slite documents:', sliteDocs.length)
        migrationItems = await sliteAdapter.convertToMigrationItems(sliteDocs)
        console.log('Converted migration items:', migrationItems.length)
        break
        
      case 'clickup':
        const clickupAdapter = new ClickUpAdapter(apiKey)
        const teamId = additionalConfig?.teamId
        if (!teamId) {
          return NextResponse.json({ 
            error: 'ClickUp teamId is required' 
          }, { status: 400 })
        }
        const clickupTasks = await clickupAdapter.fetchAllTasks(teamId)
        migrationItems = await clickupAdapter.convertToMigrationItems(clickupTasks)
        break
        
      default:
        return NextResponse.json({ 
          error: `Unsupported platform: ${platform}` 
        }, { status: 400 })
    }

    // Create or get a default workspace
    let workspace = await prisma.workspace.findFirst()
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Default Workspace',
          slug: 'default-workspace',
          description: 'Default workspace for migrations',
          ownerId: userId
        }
      })
    }

    // Create migration session for review instead of direct import
    const migrationSession = await prisma.integration.create({
      data: {
        workspaceId: workspace.id,
        type: platform.toUpperCase() as any,
        name: `${platform} Migration Session`,
        config: {
          status: 'preview',
          totalItems: migrationItems.length,
          approvedItems: 0,
          rejectedItems: 0,
          items: migrationItems
        },
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Migration from ${platform} completed - ready for review`,
      sessionId: migrationSession.id,
      totalItems: migrationItems.length,
      previewUrl: `/migrations/review`
    })

  } catch (error) {
    console.error('Migration error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// GET /api/migrations - Get migration status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/db')
    const migrations = await prisma.integration.findMany({
      where: {
        workspaceId,
        type: {
          in: ['SLITE', 'CLICKUP', 'NOTION', 'CONFLUENCE']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(migrations)

  } catch (error) {
    console.error('Error fetching migrations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch migrations' 
    }, { status: 500 })
  }
}
