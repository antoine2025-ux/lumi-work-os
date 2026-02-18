import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"

type Body = {
  personId: string
  keepManagerId: string
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = (await req.json()) as Body
    const personId = String(body.personId ?? "")
    const keepManagerId = String(body.keepManagerId ?? "")
    if (!personId || !keepManagerId) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    // Remove all other manager links for this person (v0)
    await prisma.personManagerLink.deleteMany({
      where: { orgId: workspaceId, personId, managerId: { not: keepManagerId } } as any,
    })

    // Resolve only the conflict signal for this person
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId: workspaceId,
        type: "DATA_QUALITY" as any,
        resolvedAt: null,
        dismissedAt: null,
        title: "Manager link conflict",
        contextType: "PERSON",
        contextId: personId,
      } as any,
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, req)
  }
}
