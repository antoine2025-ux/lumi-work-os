import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { logOrgAuditBatch } from "@/lib/audit/org-audit"

type Body = {
  personId: string
  keepManagerId: string
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = (await req.json()) as Body
    const personId = String(body.personId ?? "")
    const keepManagerId = String(body.keepManagerId ?? "")
    if (!personId || !keepManagerId) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    // Fetch links to delete for audit logging
    const linksToDelete = await prisma.personManagerLink.findMany({
      where: { orgId: workspaceId, personId, managerId: { not: keepManagerId } } as any,
      select: { id: true, personId: true, managerId: true },
    })

    // Remove all other manager links for this person (v0)
    await prisma.personManagerLink.deleteMany({
      where: { orgId: workspaceId, personId, managerId: { not: keepManagerId } } as any, // orgId is a Prisma field
    })

    // Log audit entries (fire-and-forget batch)
    if (linksToDelete.length > 0) {
      const auditEntries = linksToDelete.map((link) => ({
        workspaceId,
        entityType: "MANAGER_LINK" as const,
        entityId: link.id,
        entityName: `${link.personId} → ${link.managerId}`,
        action: "DELETED" as const,
        actorId: user.userId,
      }))
      logOrgAuditBatch(auditEntries).catch((e) =>
        console.error("[POST /api/org/data-quality/resolve-manager-conflicts] Audit error:", e)
      )
    }

    // Resolve only the conflict signal for this person
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId: workspaceId, // orgId is a Prisma field
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
  } catch (error) {
    return handleApiError(error, req)
  }
}
