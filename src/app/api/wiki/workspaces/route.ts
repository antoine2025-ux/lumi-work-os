import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { handleApiError } from '@/lib/api-errors'
import { WikiWorkspaceCreateSchema } from '@/lib/validations/wiki'

export async function GET(request: NextRequest) {
  try {
    // Use getUnifiedAuth for proper workspace context
    const auth = await getUnifiedAuth(request)
    const workspaceId = auth.workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER']
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    // SECURITY: Cache key includes userId because personal spaces are per-user
    const cacheKey = cache.generateKey(
      CACHE_KEYS.WORKSPACE_DATA,
      workspaceId,
      `wiki_workspaces_${auth.user.userId}`
    )

    // Check cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // SECURITY: Personal Space is per-user.
    // Return: this user's personal space + all non-personal (shared) workspaces.
    const personalSpaceId = `personal-space-${auth.user.userId}`

    const workspaces = await prisma.wiki_workspaces.findMany({
      where: {
        workspace_id: workspaceId,
        OR: [
          // This user's personal space
          { id: personalSpaceId, type: 'personal' },
          // All non-personal workspaces (team, custom, null)
          { type: { not: 'personal' } },
          { type: null },
        ],
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    // Check if this user's Personal Space exists
    const hasPersonalSpace = workspaces.some(w => w.id === personalSpaceId)

    // Create this user's Personal Space if it doesn't exist
    if (!hasPersonalSpace) {
      try {
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
            created_by_id: auth.user.userId
          }
        })
      } catch (error: any) {
        // P2002 = unique constraint violation — another request may have created it concurrently
        if (error.code !== 'P2002') {
          console.error('Error creating Personal Space:', error.message)
        }
      }

      // Re-query to include the newly created personal space
      const updatedWorkspaces = await prisma.wiki_workspaces.findMany({
        where: {
          workspace_id: workspaceId,
          OR: [
            { id: personalSpaceId, type: 'personal' },
            { type: { not: 'personal' } },
            { type: null },
          ],
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' }
        ]
      })

      const normalizedUpdated = updatedWorkspaces.map(w => {
        if (w.id?.startsWith('personal-space-')) return { ...w, name: 'Personal Space' }
        return w
      })

      await cache.set(cacheKey, normalizedUpdated, CACHE_TTL.MEDIUM)

      const response = NextResponse.json(normalizedUpdated)
      response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
      response.headers.set('X-Cache', 'MISS')
      return response
    }

    // Normalize personal space name
    const normalized = workspaces.map(w => {
      if (w.id?.startsWith('personal-space-')) return { ...w, name: 'Personal Space' }
      return w
    })

    await cache.set(cacheKey, normalized, CACHE_TTL.MEDIUM)

    const response = NextResponse.json(normalized)
    response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600')
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    console.error('Error fetching wiki workspaces:', error)
    return handleApiError(error, request)
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

    // Validate body (Zod) — WikiWorkspaceCreateSchema rejects type='personal'
    const body = WikiWorkspaceCreateSchema.parse(await request.json())
    const { name, description, type, color = '#3b82f6', icon = 'layers', isPrivate = false } = body

    // Generate a unique ID for the new workspace
    const newWikiWorkspaceId = `wiki-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Create the wiki workspace
    // If no type specified, create as a custom workspace (not 'team' or 'personal')
    // This ensures new workspaces are independent
    const workspaceType = type || null // null type means it's a custom workspace

    const newWorkspace = await prisma.wiki_workspaces.create({
      data: {
        id: newWikiWorkspaceId,
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
    return handleApiError(error, request)
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

    return NextResponse.json({ success: true, message: 'Workspace deleted successfully' })
  } catch (error) {
    console.error('Error deleting wiki workspace:', error)
    return handleApiError(error, request)
  }
}
