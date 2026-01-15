import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

type Body = {
  personIds: string[]
  status?: "AVAILABLE" | "LIMITED" | "UNAVAILABLE"
  reason?: string
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as Body
    const ids = Array.isArray(body.personIds) ? body.personIds.map(String).slice(0, 200) : []
    if (!ids.length) return NextResponse.json({ error: "personIds required" }, { status: 400 })

    const status = (body.status ?? "AVAILABLE").toUpperCase() as any
    const reason = body.reason ? String(body.reason) : null

    // Upsert availability for selected people (requires @@unique([orgId, personId]) from Step 24)
    await prisma.$transaction(
      ids.map((personId) =>
        prisma.personAvailability.upsert({
          where: { orgId_personId: { orgId, personId } } as any,
          update: { status, reason } as any,
          create: { orgId, personId, status, reason } as any,
        })
      ) as any
    )

    // Resolve only stale availability signals
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId,
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

