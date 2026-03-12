import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { RefreshAvailabilitySchema } from '@/lib/validations/org'
import { OrgHealthSignalType } from '@prisma/client'

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

    // Create availability records for selected people (using current schema)
    const now = new Date()
    await prisma.$transaction(
      ids.map((personId) =>
        prisma.personAvailability.create({
          data: {
            workspaceId,
            personId,
            type: 'AVAILABLE',
            startDate: now,
            source: 'MANUAL',
          },
        })
      )
    )

    // Resolve only stale availability signals
    await prisma.orgHealthSignal.updateMany({
      where: {
        workspaceId,
        type: "DATA_QUALITY" as OrgHealthSignalType,
        resolvedAt: null,
        dismissedAt: null,
        title: "Stale availability",
        contextType: "PERSON",
        contextId: { in: ids },
      },
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true, updated: ids.length })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}
