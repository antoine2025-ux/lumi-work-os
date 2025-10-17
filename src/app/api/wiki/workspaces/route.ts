import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'

    // Get wiki workspaces for the current workspace
    const workspaces = await prisma.wiki_workspaces.findMany({
      where: {
        workspace_id: workspaceId
      }
    })

    // If no workspaces exist, create default ones
    if (workspaces.length === 0) {
      // Get the first available user or create a default one
      let userId = 'dev-user-1'
      try {
        const existingUser = await prisma.user.findFirst()
        if (existingUser) {
          userId = existingUser.id
        } else {
          // Create a default user if none exists
          const newUser = await prisma.user.upsert({
            where: { email: 'dev@lumi.com' },
            update: {},
            create: {
              name: 'Default User',
              email: 'dev@lumi.com'
            }
          })
          userId = newUser.id
        }
      } catch (error) {
        console.error('Error getting/creating user:', error)
        // If we can't get a user, skip creating workspaces
        return NextResponse.json([])
      }

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
          created_by_id: userId
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
          created_by_id: userId
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