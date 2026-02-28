import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"

type Action = "resolve" | "dismiss"

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as { action?: Action }

    const action = body.action
    if (action !== "resolve" && action !== "dismiss") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Ensure org scoping: only update signals belonging to active org
    const existing = await prisma.orgHealthSignal.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const now = new Date()

    await prisma.orgHealthSignal.update({
      where: { id },
      data:
        action === "resolve"
          ? { resolvedAt: now }
          : { dismissedAt: now },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, req)
  }
}
