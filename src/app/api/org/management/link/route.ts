import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

type Body = {
  personId: string
  managerId: string
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as Body

    if (!body?.personId || !body?.managerId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Basic validation: ensure both are people in org (best-effort via OrgPosition)
    const [p1, p2] = await Promise.all([
      prisma.orgPosition?.findFirst?.({
        where: { workspaceId: orgId, userId: body.personId, isActive: true } as any,
        select: { userId: true } as any,
      } as any),
      prisma.orgPosition?.findFirst?.({
        where: { workspaceId: orgId, userId: body.managerId, isActive: true } as any,
        select: { userId: true } as any,
      } as any),
    ])

    if (!p1 || !p2) return NextResponse.json({ error: "Person not found" }, { status: 404 })

    await prisma.personManagerLink.create({
      data: {
        orgId,
        personId: body.personId,
        managerId: body.managerId,
      },
    })

    // Resolve specific "People missing manager links" signal (precise)
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId,
        resolvedAt: null,
        dismissedAt: null,
        type: "MANAGEMENT_LOAD" as any,
        title: "People missing manager links",
      } as any,
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

