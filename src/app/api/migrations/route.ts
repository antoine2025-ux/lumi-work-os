// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { SliteAdapter } from '@/lib/migrations/adapters/slite-adapter'
import { ClickUpAdapter } from '@/lib/migrations/adapters/clickup-adapter'

// POST /api/migrations - Start a new migration
export async function POST(request: NextRequest) {
  try {
    console.log('=== MIGRATION API CALLED ===')

    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, apiKey, workspaceId, additionalConfig } = body

    if (!platform || !apiKey || !workspaceId) {
      return NextResponse.json({
        error: 'Missing required fields: platform, apiKey, workspaceId'
      }, { status: 400 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN'],
    })
    setWorkspaceContext(workspaceId)

    console.log('🔐 Authenticated user:', auth.user.email, auth.isDevelopment ? '(dev mode)' : '(production)')

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

    // Use the requested workspace for migration
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
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
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(workspaceId)
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
