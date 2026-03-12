// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { SliteAdapter } from '@/lib/migrations/adapters/slite-adapter'
import { ClickUpAdapter } from '@/lib/migrations/adapters/clickup-adapter'
import { StartMigrationSchema } from '@/lib/validations/workspace'
import { IntegrationType } from '@prisma/client'

// POST /api/migrations - Start a new migration
export async function POST(request: NextRequest) {
  try {
    console.log('=== MIGRATION API CALLED ===')

    // Get authenticated user with development fallback
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const body = StartMigrationSchema.parse(await request.json())
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
        const sliteAdapter = new SliteAdapter(apiKey)
        const sliteDocs = await sliteAdapter.fetchAllDocuments()
        migrationItems = await sliteAdapter.convertToMigrationItems(sliteDocs)
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
        type: platform.toUpperCase() as IntegrationType,
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

  } catch (error: unknown) {
    return handleApiError(error, request)
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

  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
