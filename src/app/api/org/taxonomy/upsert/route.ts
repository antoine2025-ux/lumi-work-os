import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { requireActiveWorkspaceId } from "@/server/org/context"
import { normalizeRole, normalizeSkill } from "@/server/org/taxonomy/normalize"
import { assertWriteAllowed } from "@/server/org/writes/guard"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

type Body = { kind: "ROLE" | "SKILL"; labels: string[] }

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = await requireActiveWorkspaceId()
    assertWriteAllowed("taxonomy.upsert")
    const body = (await req.json()) as Body
    const kind = String(body.kind ?? "").toUpperCase()
    const labels = Array.isArray(body.labels) ? body.labels.map(String) : []
    const cleaned = Array.from(new Set(labels.map((x) => (kind === "SKILL" ? normalizeSkill(x) : normalizeRole(x))).filter(Boolean))).slice(0, 50)

    if (!cleaned.length) return NextResponse.json({ ok: true })

    if (kind === "ROLE") {
      await prisma.orgRoleTaxonomy.createMany({ data: cleaned.map((label) => ({ orgId: workspaceId, label })) as any, skipDuplicates: true } as any)
      revalidateTag("org:taxonomy", "default")
      revalidateTag("org:contracts", "default")
      return NextResponse.json({ ok: true })
    }

    if (kind === "SKILL") {
      await prisma.orgSkillTaxonomy.createMany({ data: cleaned.map((label) => ({ orgId: workspaceId, label })) as any, skipDuplicates: true } as any)
      revalidateTag("org:taxonomy", "default")
      revalidateTag("org:contracts", "default")
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "invalid kind" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

