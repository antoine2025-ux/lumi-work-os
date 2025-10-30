import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

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
      },
      orderBy: [
        { type: 'asc' }, // Sort by type
        { name: 'asc' } // Then alphabetically
      ]
    })

    console.log('📋 Current workspaces:', workspaces.map(w => ({ id: w.id, name: w.name, type: w.type })))
    console.log('🔍 Looking for Personal Space and Team Workspace in workspace:', workspaceId)

    // Check if Personal Space and Team Workspace exist by type
    const hasPersonalSpace = workspaces.some(w => w.type === 'personal')
    const hasTeamWorkspace = workspaces.some(w => w.type === 'team')
    
    console.log('📊 Workspace types breakdown:', {
      personal: workspaces.filter(w => w.type === 'personal').length,
      team: workspaces.filter(w => w.type === 'team').length,
      custom: workspaces.filter(w => w.type !== 'personal' && w.type !== 'team').length,
      total: workspaces.length
    })
    
    console.log('✓ Has Personal Space:', hasPersonalSpace)
    console.log('✓ Has Team Workspace:', hasTeamWorkspace)
    
    // Create missing default workspaces
    if (!hasPersonalSpace || !hasTeamWorkspace) {
      console.log('Creating default workspaces for workspace:', workspaceId)
      
      if (!hasPersonalSpace) {
        try {
          // Use workspace-specific ID
          const personalSpaceId = `personal-space-${workspaceId}`
          await prisma.wiki_workspaces.create({
            data: {
              id: personalSpaceId,
              workspace_id: workspaceId,
              name: 'Personal Space',
              type: 'personal',
              color: '#10b981',
              icon: 'file-text',
              description: 'Your personal knowledge space',
              is_private: true,
              created_by_id: user.id
            }
          })
          console.log('✅ Created Personal Space')
        } catch (error: any) {
          console.error('❌ Error creating Personal Space:', error.message, error.code)
          // Don't throw, just continue
        }
      }
      
      if (!hasTeamWorkspace) {
        try {
          // Use workspace-specific ID
          const teamWorkspaceId = `team-workspace-${workspaceId}`
          await prisma.wiki_workspaces.create({
            data: {
              id: teamWorkspaceId,
              workspace_id: workspaceId,
              name: 'Team Workspace',
              type: 'team',
              color: '#3b82f6',
              icon: 'layers',
              description: 'Collaborative workspace for your team',
              is_private: false,
              created_by_id: user.id
            }
          })
          console.log('✅ Created Team Workspace')
        } catch (error: any) {
          console.error('❌ Error creating Team Workspace:', error.message, error.code)
          // Don't throw, just continue
        }
      }

      // Return the updated workspaces list
      const updatedWorkspaces = await prisma.wiki_workspaces.findMany({
        where: {
          workspace_id: workspaceId
        }
      })

      console.log('📤 Returning updated workspaces:', updatedWorkspaces.map(w => ({ id: w.id, name: w.name, type: w.type })))
      
      // Normalize ONLY default workspace names (identified by ID pattern)
      const normalizedUpdated = updatedWorkspaces.map(w => {
        if (w.id?.startsWith('personal-space-')) return { ...w, name: 'Personal Space' }
        if (w.id?.startsWith('team-workspace-')) return { ...w, name: 'Team Workspace' }
        return w
      })
      
      return NextResponse.json(normalizedUpdated)
    }

    console.log('📤 Returning existing workspaces:', workspaces.map(w => ({ id: w.id, name: w.name, type: w.type })))
    
    // Normalize ONLY default workspace names (identified by ID pattern)
    const normalized = workspaces.map(w => {
      if (w.id?.startsWith('personal-space-')) return { ...w, name: 'Personal Space' }
      if (w.id?.startsWith('team-workspace-')) return { ...w, name: 'Team Workspace' }
      return w
    })
    
    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error fetching wiki workspaces:', error)
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
  }
}

// POST /api/wiki/workspaces - Create a new wiki workspace
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { name, description, type = 'team', color = '#3b82f6', icon = 'layers', isPrivate = false } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // Generate a unique ID for the new workspace
    const workspaceId = `wiki-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Create the wiki workspace
    const newWorkspace = await prisma.wiki_workspaces.create({
      data: {
        id: workspaceId,
        workspace_id: auth.workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        type: type || 'team',
        color: color || '#3b82f6',
        icon: icon || 'layers',
        is_private: isPrivate || false,
        created_by_id: auth.user.userId
      }
    })

    return NextResponse.json(newWorkspace, { status: 201 })
  } catch (error) {
    console.error('Error creating wiki workspace:', error)
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }
}

// DELETE /api/wiki/workspaces - Delete a wiki workspace
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const workspaceIdToDelete = searchParams.get('id')

    if (!workspaceIdToDelete) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // Prevent deletion of default workspaces (Personal Space and Team Workspace)
    if (workspaceIdToDelete.startsWith('personal-space-') || workspaceIdToDelete.startsWith('team-workspace-')) {
      return NextResponse.json({ error: 'Default workspaces (Personal Space and Team Workspace) cannot be deleted' }, { status: 403 })
    }

    // Delete the workspace
    await prisma.wiki_workspaces.delete({
      where: {
        id: workspaceIdToDelete
      }
    })

    console.log('✅ Deleted workspace:', workspaceIdToDelete)
    return NextResponse.json({ success: true, message: 'Workspace deleted successfully' })
  } catch (error) {
    console.error('Error deleting wiki workspace:', error)
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })
  }
}