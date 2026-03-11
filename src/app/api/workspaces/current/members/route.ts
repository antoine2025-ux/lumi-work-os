import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

/**
 * GET /api/workspaces/current/members
 *
 * Returns workspace members with their org positions for assignment dropdowns.
 * Uses auth.workspaceId as the current workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.workspaceId) {
      return NextResponse.json(
        { error: 'No workspace context' },
        { status: 400 }
      )
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: auth.workspaceId },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        user: { name: 'asc' },
      },
    })

    // perf: eliminated N+1 — batch fetch all active positions for all members in one query
    const userIds = members.map((m) => m.userId)
    const positions = await prisma.orgPosition.findMany({
      where: {
        userId: { in: userIds },
        workspaceId: auth.workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        userId: true,
        team: {
          select: {
            name: true,
            department: {
              select: { name: true },
            },
          },
        },
      },
    })

    // Keep only the first active position per user (mirrors findFirst semantics)
    const positionByUserId = new Map(
      positions.map((p) => [p.userId, p])
    )

    const membersWithPositions = members.map((member) => {
      const position = positionByUserId.get(member.userId)
      const departmentName =
        position?.team?.department?.name ?? position?.team?.name ?? null

      return {
        userId: member.userId,
        user: member.user,
        role: member.role,
        orgPositionId: position?.id,
        orgPositionTitle: position?.title,
        department: departmentName,
        isCurrentUser: member.userId === auth.user.userId,
      }
    })

    return NextResponse.json({
      members: membersWithPositions,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
