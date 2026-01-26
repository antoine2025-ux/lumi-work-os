import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"
import { ensureDefaultTaxonomy } from "@/server/org/taxonomy/seed"

export const revalidate = 60

export async function GET(req: Request) {
  try {
    const orgId = await requireActiveOrgId()
    await ensureDefaultTaxonomy(orgId)

    const url = new URL(req.url)
    const q = String(url.searchParams.get("q") ?? "").trim()
    const take = Math.max(1, Math.min(20, Number(url.searchParams.get("take") ?? 10)))

    const rows = await prisma.orgRoleTaxonomy.findMany({
      where: { orgId, ...(q ? { label: { contains: q, mode: "insensitive" } as any } : {}) } as any,
      select: { label: true } as any,
      orderBy: { label: "asc" } as any,
      take,
    } as any)

    return NextResponse.json({ ok: true, roles: rows.map((r: any) => String(r.label)) })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

