import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

type Body = {
  personId: string
  targetTotalPct: number // e.g., 100
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as Body
    const personId = String(body.personId ?? "")
    const target = Number(body.targetTotalPct ?? 100)
    if (!personId || !Number.isFinite(target) || target <= 0 || target > 200) {
      return NextResponse.json({ error: "Invalid fields" }, { status: 400 })
    }

    // Normalize allocations for person proportionally (v0)
    const rows = await prisma.capacityAllocation.findMany({
      where: { orgId, personId } as any,
      select: { id: true, percent: true } as any,
      take: 1000,
    })

    const total = rows.reduce((s, r) => s + Number((r as any).percent ?? 0), 0)
    if (total <= 0) return NextResponse.json({ ok: true, updated: 0 })

    const ops = rows.map((r) => {
      const cur = Number((r as any).percent ?? 0)
      const next = Math.max(0, Math.round((cur / total) * target))
      return prisma.capacityAllocation.update({
        where: { id: (r as any).id } as any,
        data: { percent: next } as any,
      })
    })

    await prisma.$transaction(ops as any)

    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId,
        type: "DATA_QUALITY" as any,
        resolvedAt: null,
        dismissedAt: null,
        title: "Over-allocation",
        contextType: "PERSON",
        contextId: personId,
      } as any,
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true, updated: rows.length })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

