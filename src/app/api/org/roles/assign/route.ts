import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

type Body = {
  personId: string
  role: string
  percent?: number
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as Body

    if (!body?.personId || !body?.role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const percent = typeof body.percent === "number" ? Math.max(1, Math.min(100, body.percent)) : 100

    const person = await prisma.orgPosition?.findFirst?.({
      where: { workspaceId: orgId, userId: body.personId, isActive: true } as any,
      select: { userId: true } as any,
    } as any)

    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 })

    await prisma.personRoleAssignment.create({
      data: { orgId, personId: body.personId, role: body.role, percent },
    })

    // Note: Role-gap signals will be recomputed on next refresh for accuracy

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

