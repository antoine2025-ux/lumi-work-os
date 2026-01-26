import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"
import { normalizeRole, normalizeSkill } from "@/server/org/taxonomy/normalize"
import { assertWriteAllowed } from "@/server/org/writes/guard"

type Body = { kind: "ROLE" | "SKILL"; labels: string[] }

export async function POST(req: Request) {
  try {
    const orgId = await requireActiveOrgId()
    assertWriteAllowed("taxonomy.upsert")
    const body = (await req.json()) as Body
    const kind = String(body.kind ?? "").toUpperCase()
    const labels = Array.isArray(body.labels) ? body.labels.map(String) : []
    const cleaned = Array.from(new Set(labels.map((x) => (kind === "SKILL" ? normalizeSkill(x) : normalizeRole(x))).filter(Boolean))).slice(0, 50)

    if (!cleaned.length) return NextResponse.json({ ok: true })

    if (kind === "ROLE") {
      await prisma.orgRoleTaxonomy.createMany({ data: cleaned.map((label) => ({ orgId, label })) as any, skipDuplicates: true } as any)
      revalidateTag("org:taxonomy")
      revalidateTag("org:contracts")
      return NextResponse.json({ ok: true })
    }

    if (kind === "SKILL") {
      await prisma.orgSkillTaxonomy.createMany({ data: cleaned.map((label) => ({ orgId, label })) as any, skipDuplicates: true } as any)
      revalidateTag("org:taxonomy")
      revalidateTag("org:contracts")
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "invalid kind" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

