import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { canAccessWikiWorkspace } from '@/lib/wiki/permissions'

// GET /api/wiki/workspaces/[id]/members - List wiki workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: wikiWorkspaceId } = await params
    const auth = await getUnifiedAuth(request)

    if (!auth.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify wiki workspace exists and belongs to this workspace
    const wikiWorkspace = await prisma.wiki_workspaces.findUnique({
      where: { id: wikiWorkspaceId },
    })

    if (!wikiWorkspace || wikiWorkspace.workspace_id !== auth.workspaceId) {
      return NextResponse.json({ error: 'Wiki workspace not found' }, { status: 404 })
    }

    // User must have access to view members
    const hasAccess = await canAccessWikiWorkspace(auth.user.userId, wikiWorkspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const members = await prisma.wikiWorkspaceMember.findMany({
      where: { wikiWorkspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching wiki workspace members:', error)
    return handleApiError(error, request)
  }
}

// POST /api/wiki/workspaces/[id]/members - Add member (OWNER only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: wikiWorkspaceId } = await params
    const auth = await getUnifiedAuth(request)

    if (!auth.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { userId: targetUserId, role = 'VIEWER' } = body

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const wikiWorkspace = await prisma.wiki_workspaces.findUnique({
      where: { id: wikiWorkspaceId },
      include: {
        members: true,
      },
    })

    if (!wikiWorkspace || wikiWorkspace.workspace_id !== auth.workspaceId) {
      return NextResponse.json({ error: 'Wiki workspace not found' }, { status: 404 })
    }

    const isOwner =
      wikiWorkspace.created_by_id === auth.user.userId ||
      wikiWorkspace.members.some(
        (m) => m.userId === auth.user.userId && m.role === 'OWNER'
      )

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - must be workspace owner to add members' },
        { status: 403 }
      )
    }

    const validRoles = ['OWNER', 'EDITOR', 'VIEWER']
    const memberRole = validRoles.includes(role) ? role : 'VIEWER'

    const member = await prisma.wikiWorkspaceMember.create({
      data: {
        wikiWorkspaceId,
        userId: targetUserId,
        role: memberRole,
        grantedById: auth.user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Error adding wiki workspace member:', error)
    return handleApiError(error, request)
  }
}
