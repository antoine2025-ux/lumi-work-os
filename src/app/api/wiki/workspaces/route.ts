import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in our database
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || 'User',
        image: session.user.image,
        emailVerified: new Date(),
      }
    })

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        members: {
          some: { userId: user.id }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const workspaceId = workspace.id

    // Get wiki workspaces for the current workspace
    const workspaces = await prisma.wiki_workspaces.findMany({
      where: {
        workspace_id: workspaceId
      }
    })

    // If no workspaces exist, create default ones
    if (workspaces.length === 0) {
      const defaultWorkspaces = [
        {
          id: 'personal-space',
          workspace_id: workspaceId,
          name: 'Personal Space',
          type: 'personal',
          color: '#10b981',
          icon: 'file-text',
          description: 'Your personal knowledge space',
          is_private: true,
          created_by_id: user.id
        },
        {
          id: 'team-workspace',
          workspace_id: workspaceId,
          name: 'Team Workspace',
          type: 'team',
          color: '#3b82f6',
          icon: 'layers',
          description: 'Collaborative workspace for your team',
          is_private: false,
          created_by_id: user.id
        }
      ]

      for (const workspace of defaultWorkspaces) {
        await prisma.wiki_workspaces.create({
          data: workspace
        })
      }

      // Return the created workspaces
      const createdWorkspaces = await prisma.wiki_workspaces.findMany({
        where: {
          workspace_id: workspaceId
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