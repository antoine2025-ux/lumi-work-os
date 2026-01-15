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

    // Note: orgRoleTaxonomy model requires prisma generate to be recognized in types
    const rows = await (prisma as any).orgRoleTaxonomy.findMany({
      where: { orgId, ...(q ? { label: { contains: q, mode: "insensitive" } } : {}) },
      select: { label: true },
      orderBy: { label: "asc" },
      take,
    }) as { label: string }[]

    return NextResponse.json({ ok: true, roles: rows.map((r) => r.label) })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

