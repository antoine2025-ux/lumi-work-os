import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { RefreshAvailabilitySchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = RefreshAvailabilitySchema.parse(await req.json())
    const ids = body.personIds ? body.personIds.slice(0, 200) : []
    if (!ids.length) return NextResponse.json({ error: "personIds required" }, { status: 400 })

    const status = "AVAILABLE" as any
    const reason = null

    // Upsert availability for selected people
    await prisma.$transaction(
      ids.map((personId) =>
        prisma.personAvailability.upsert({
          where: { orgId_personId: { orgId: workspaceId, personId } } as any, // orgId is a Prisma field
          update: { status, reason } as any,
          create: { orgId: workspaceId, personId, status, reason } as any, // orgId is a Prisma field
        })
      ) as any
    )

    // Resolve only stale availability signals
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId: workspaceId,
        type: "DATA_QUALITY" as any,
        resolvedAt: null,
        dismissedAt: null,
        title: "Stale availability",
        contextType: "PERSON",
        contextId: { in: ids },
      } as any,
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true, updated: ids.length })
  } catch (error) {
    return handleApiError(error, req)
  }
}
