import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/wiki/workspaces - Get workspaces for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get workspaces (for now, return mock data - later integrate with actual workspace system)
    const workspaces = [
      {
        id: 'personal',
        name: 'Personal Space',
        type: 'personal' as const,
        color: '#10b981',
        icon: 'file-text',
        pageCount: 5
      },
      {
        id: 'team',
        name: 'Team Workspace',
        type: 'team' as const,
        color: '#3b82f6',
        icon: 'layers',
        pageCount: 12
      }
    ]

    logger.info('Wiki workspaces fetched', { userId: user.id, workspaceId })
    return NextResponse.json(workspaces)
  } catch (error) {
    logger.error('Error fetching wiki workspaces', {}, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/wiki/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type = 'team', color = '#3b82f6', icon = 'layers' } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For now, return mock response - later implement actual workspace creation
    const newWorkspace = {
      id: `workspace-${Date.now()}`,
      name,
      type,
      color,
      icon,
      pageCount: 0
    }

    logger.info('Wiki workspace created', { userId: user.id, workspaceName: name })
    return NextResponse.json(newWorkspace, { status: 201 })
  } catch (error) {
    logger.error('Error creating wiki workspace', {}, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
