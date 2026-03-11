import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { UpdateHealthSignalSchema } from "@/lib/validations/org"

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
    const body = UpdateHealthSignalSchema.parse(await req.json())
    const action = body.action

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
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}
