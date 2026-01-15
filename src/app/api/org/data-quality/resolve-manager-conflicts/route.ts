import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

type Body = {
  personId: string
  keepManagerId: string
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as Body
    const personId = String(body.personId ?? "")
    const keepManagerId = String(body.keepManagerId ?? "")
    if (!personId || !keepManagerId) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    // Remove all other manager links for this person (v0)
    await prisma.personManagerLink.deleteMany({
      where: { orgId, personId, managerId: { not: keepManagerId } } as any,
    })

    // Resolve only the conflict signal for this person
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId,
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

