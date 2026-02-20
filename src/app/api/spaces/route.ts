import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { CreateSpaceSchema } from '@/lib/validations/spaces'
import { getAccessibleSpaces, getOrCreatePersonalSpace } from '@/lib/spaces'

// GET /api/spaces — list all spaces accessible to the current user,
// auto-creating their personal space on first visit.
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    // Ensure the user always has a personal space.
    await getOrCreatePersonalSpace(
      auth.workspaceId,
      auth.user.userId,
      auth.user.name ?? undefined,
    )

    const spaces = await getAccessibleSpaces(auth.user.userId, auth.workspaceId)

    return NextResponse.json({ spaces })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// POST /api/spaces — create a new PUBLIC or PRIVATE space.
// Personal spaces are created automatically; clients should not POST isPersonal=true.
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const body = CreateSpaceSchema.parse(await request.json())

    // Personal spaces cannot be created via the API; use the auto-creation path.
    if (body.visibility === 'PERSONAL') {
      return NextResponse.json(
        { error: 'Personal spaces are created automatically.' },
        { status: 400 },
      )
    }

    const space = await prisma.space.create({
      data: {
        workspaceId: auth.workspaceId,
        ownerId: auth.user.userId,
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        visibility: body.visibility,
        parentId: body.parentId,
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        _count: { select: { members: true, projects: true, wikiPages: true } },
      },
    })

    // For PRIVATE spaces, the owner is implicitly included via ownerId.
    // No separate SpaceMember row needed for the creator.

    return NextResponse.json(space, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
