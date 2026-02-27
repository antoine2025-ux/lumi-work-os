/**
 * GET /api/projects/[projectId]/members
 * List project members for @mention suggestions in task comments.
 */

import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { assertProjectAccess } from "@/lib/pm/guards"
import { handleApiError } from "@/lib/api-errors"
import { prisma } from "@/lib/db"
import { ProjectRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const { projectId } = await params

    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name,
    }
    await assertProjectAccess(
      nextAuthUser,
      projectId,
      ProjectRole.VIEWER,
      auth.workspaceId
    )

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(
      members.map((m) => ({ user: m.user }))
    )
  } catch (error) {
    return handleApiError(error, request)
  }
}
