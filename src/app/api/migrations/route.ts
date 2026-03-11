// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { SliteAdapter } from '@/lib/migrations/adapters/slite-adapter'
import { ClickUpAdapter } from '@/lib/migrations/adapters/clickup-adapter'
import { StartMigrationSchema } from '@/lib/validations/workspace'
import { IntegrationType } from '@prisma/client'

// POST /api/migrations - Start a new migration
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user with development fallback
    const auth = await getUnifiedAuth(request)
    const body = StartMigrationSchema.parse(await request.json())
    const { platform, apiKey, workspaceId, additionalConfig } = body

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

  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
