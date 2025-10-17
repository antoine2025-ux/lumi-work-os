import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'

    // Get wiki workspaces for the current workspace
    const workspaces = await prisma.wikiWorkspace.findMany({
      where: {
        workspaceId: workspaceId
      },
      include: {
        _count: {
          select: {
            pages: true
          }
        }
      }
    })

    // If no workspaces exist, create default ones
    if (workspaces.length === 0) {
      const defaultWorkspaces = [
        {
          id: 'personal-space',
          workspaceId: workspaceId,
          name: 'Personal Space',
          type: 'personal',
          color: '#10b981',
          icon: 'file-text',
          description: 'Your personal knowledge space',
          isPrivate: true,
          createdById: 'dev-user-1'
        },
        {
          id: 'team-workspace',
          workspaceId: workspaceId,
          name: 'Team Workspace',
          type: 'team',
          color: '#3b82f6',
          icon: 'layers',
          description: 'Collaborative workspace for your team',
          isPrivate: false,
          createdById: 'dev-user-1'
        }
      ]

      for (const workspace of defaultWorkspaces) {
        await prisma.wikiWorkspace.create({
          data: workspace
        })
      }

      // Return the created workspaces
      const createdWorkspaces = await prisma.wikiWorkspace.findMany({
        where: {
          workspaceId: workspaceId
        },
        include: {
          _count: {
            select: {
              pages: true
            }
          }
        }
      })

      return NextResponse.json(createdWorkspaces)
    }

    return NextResponse.json(workspaces)
  } catch (error) {
    console.error('Error fetching wiki workspaces:', error)
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
  }
}