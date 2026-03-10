import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveWorkspaceId } from "@/server/org/context"
import { ensureDefaultTaxonomy } from "@/server/org/taxonomy/seed"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

export const revalidate = 60

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = await requireActiveWorkspaceId()
    await ensureDefaultTaxonomy(workspaceId)

    const url = new URL(req.url)
    const q = String(url.searchParams.get("q") ?? "").trim()
    const take = Math.max(1, Math.min(20, Number(url.searchParams.get("take") ?? 10)))

    const rows = await prisma.orgSkillTaxonomy.findMany({
      where: { orgId: workspaceId, ...(q ? { label: { contains: q, mode: "insensitive" } as any } : {}) } as any,
      select: { label: true } as any,
      orderBy: { label: "asc" } as any,
      take,
    } as any)

    return NextResponse.json({ ok: true, skills: rows.map((r: any) => String(r.label)) })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}

