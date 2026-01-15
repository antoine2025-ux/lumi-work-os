import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

export async function GET(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    // Note: systemEntity model requires prisma generate to be recognized in types
    const systems = await (prisma as any).systemEntity.findMany({
      where: { orgId },
      select: { id: true, name: true, description: true, createdAt: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }) as { id: string; name: string; description: string | null; createdAt: Date }[]
    return NextResponse.json({ systems })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as { name?: string; description?: string }
    const name = String(body?.name ?? "").trim()
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

    const created = await (prisma as any).systemEntity.create({
      data: { orgId, name, description: body?.description ?? null },
      select: { id: true },
    }) as { id: string }
    return NextResponse.json({ ok: true, id: created.id })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as { id?: string; name?: string; description?: string }
    const id = String(body?.id ?? "")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const name = body?.name ? String(body.name).trim() : undefined

    await (prisma as any).systemEntity.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(body?.description !== undefined ? { description: body.description } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

