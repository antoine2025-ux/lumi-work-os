import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

export async function GET(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const domains = await prisma.domain.findMany({
      where: { orgId },
      select: { id: true, name: true, description: true, createdAt: true } as any,
      take: 5000,
      orderBy: { createdAt: "desc" } as any,
    })
    return NextResponse.json({ domains })
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

    const created = await prisma.domain.create({
      data: { orgId, name, description: body?.description ?? null },
      select: { id: true } as any,
    })
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

    await prisma.domain.update({
      where: { id } as any,
      data: {
        ...(name ? { name } : {}),
        ...(body?.description !== undefined ? { description: body.description } : {}),
      } as any,
    })

    // NOTE: Ownership completeness will update on refresh; no aggressive signal resolving here.
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

