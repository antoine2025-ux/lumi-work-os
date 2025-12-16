import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

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

    // Generate cache key
    const cacheKey = cache.generateKey(
      CACHE_KEYS.WORKSPACE_DATA,
      workspaceId,
      'wiki_workspaces'
    )

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

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
    console.log('🔍 Looking for Personal Space in workspace:', workspaceId)

    // Check if Personal Space exists (ONLY default workspace)
    const hasPersonalSpace = workspaces.some(w => w.type === 'personal')
    
    console.log('📊 Workspace types breakdown:', {
      personal: workspaces.filter(w => w.type === 'personal').length,
      custom: workspaces.filter(w => w.type !== 'personal').length,
      total: workspaces.length
    })
    
    console.log('✓ Has Personal Space:', hasPersonalSpace)
    
    // Create missing Personal Space (ONLY default workspace)
    // Team Workspace is no longer auto-created - users create custom workspaces as needed
    if (!hasPersonalSpace) {
      console.log('Creating Personal Space for workspace:', workspaceId)
      
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
        return w
      })
      
      // Cache the result
      await cache.set(cacheKey, normalizedUpdated, CACHE_TTL.MEDIUM)
      
      const response = NextResponse.json(normalizedUpdated)
      response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
      response.headers.set('X-Cache', 'MISS')
      return response
    }

    console.log('📤 Returning existing workspaces:', workspaces.map(w => ({ id: w.id, name: w.name, type: w.type })))
    
    // Normalize ONLY default workspace names (identified by ID pattern)
    const normalized = workspaces.map(w => {
      if (w.id?.startsWith('personal-space-')) return { ...w, name: 'Personal Space' }
      return w
    })
    
    // Cache the result
    await cache.set(cacheKey, normalized, CACHE_TTL.MEDIUM)
    
    const response = NextResponse.json(normalized)
    response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
    response.headers.set('X-Cache', 'MISS')
    return response
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
    // Default to a custom workspace type (not 'team' or 'personal')
    // Users can specify type if they want, but new workspaces are independent by default
    const { name, description, type, color = '#3b82f6', icon = 'layers', isPrivate = false } = body
    
    // Validate type - don't allow creating 'personal' type workspaces (that's reserved)
    if (type === 'personal') {
      return NextResponse.json({ error: 'Personal Space is a reserved workspace type and cannot be created' }, { status: 400 })
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // Generate a unique ID for the new workspace
    const workspaceId = `wiki-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Create the wiki workspace
    // If no type specified, create as a custom workspace (not 'team' or 'personal')
    // This ensures new workspaces are independent
    const workspaceType = type || null // null type means it's a custom workspace
    
    const newWorkspace = await prisma.wiki_workspaces.create({
      data: {
        id: workspaceId,
        workspace_id: auth.workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        type: workspaceType, // Can be null for custom workspaces, or 'team' if explicitly specified
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

    // Prevent deletion of Personal Space (ONLY default workspace)
    if (workspaceIdToDelete.startsWith('personal-space-')) {
      return NextResponse.json({ error: 'Personal Space is a default workspace and cannot be deleted' }, { status: 403 })
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