import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { AdjustAllocationSchema } from '@/lib/validations/org'
import { OrgHealthSignalType } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = AdjustAllocationSchema.parse(await req.json())
    const { personId, adjustment, reason } = body;
    const target = 100 + adjustment;

    // Normalize allocations for person proportionally (v0)
    const rows = await prisma.capacityAllocation.findMany({
      where: { workspaceId, personId },
      select: { id: true, percent: true },
      take: 1000,
    })

    const total = rows.reduce((s, r) => s + Number(r.percent ?? 0), 0)
    if (total <= 0) return NextResponse.json({ ok: true, updated: 0 })

    const ops = rows.map((r) => {
      const cur = Number(r.percent ?? 0)
      const next = Math.max(0, Math.round((cur / total) * target))
      return prisma.capacityAllocation.update({
        where: { id: r.id },
        data: { percent: next },
      })
    })

    await prisma.$transaction(ops)

    await prisma.orgHealthSignal.updateMany({
      where: {
        workspaceId,
        type: "DATA_QUALITY" as OrgHealthSignalType,
        resolvedAt: null,
        dismissedAt: null,
        title: "Over-allocation",
        contextType: "PERSON",
        contextId: personId,
      },
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true, updated: rows.length })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}
