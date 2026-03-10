import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { prisma } from "@/lib/db"

const MAX_LIMIT = 20

function buildEntityUrl(entity: string, entityId: string): string {
  switch (entity) {
    case "goal":
      return `/goals/${entityId}`
    case "task":
      return `/projects/${entityId}`
    case "wiki_page":
      return `/wiki/${entityId}`
    case "project":
      return `/projects/${entityId}`
    default:
      return "#"
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER", "MEMBER", "ADMIN", "OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || 10), MAX_LIMIT)
      : 10

    const activities = await prisma.activity.findMany({
      where: { workspaceId: auth.workspaceId },
      select: {
        id: true,
        entity: true,
        entityId: true,
        action: true,
        actorId: true,
        createdAt: true,
        actor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    const items = activities.map((a) => ({
      id: a.id,
      entity: a.entity,
      entityId: a.entityId,
      action: a.action,
      actorName: a.actor?.name ?? "Unknown",
      createdAt: a.createdAt.toISOString(),
      url: buildEntityUrl(a.entity, a.entityId),
    }))

    return NextResponse.json({ items })
  } catch (error) {
    return handleApiError(error, request)
  }
}
