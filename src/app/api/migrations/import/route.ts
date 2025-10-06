import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MigrationService } from '@/lib/migrations/migration-service'

// POST /api/migrations/import - Import selected migration items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, itemIds } = body

    if (!sessionId || !itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json({ 
        error: 'Missing required fields: sessionId, itemIds' 
      }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get migration session
    const migrationSession = await prisma.integration.findUnique({
      where: { id: sessionId }
    })

    if (!migrationSession) {
      return NextResponse.json({ error: 'Migration session not found' }, { status: 404 })
    }

    // Filter items to import
    const allItems = migrationSession.config?.items || []
    const itemsToImport = allItems.filter((item: any) => itemIds.includes(item.id))

    if (itemsToImport.length === 0) {
      return NextResponse.json({ error: 'No items selected for import' }, { status: 400 })
    }

    // Import items using MigrationService
    const migrationService = new MigrationService('workspace-1', user.id)
    const result = await migrationService.migrateItems(itemsToImport)

    // Update migration session
    const updatedConfig = {
      ...migrationSession.config,
      status: 'imported',
      approvedItems: (migrationSession.config?.approvedItems || 0) + result.importedCount,
      rejectedItems: (migrationSession.config?.rejectedItems || 0) + result.failedCount
    }

    await prisma.integration.update({
      where: { id: sessionId },
      data: {
        config: updatedConfig
      }
    })

    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      failedCount: result.failedCount,
      errors: result.errors
    })

  } catch (error) {
    console.error('Error importing migration items:', error)
    return NextResponse.json({ 
      error: 'Failed to import migration items',
      details: error.message 
    }, { status: 500 })
  }
}

