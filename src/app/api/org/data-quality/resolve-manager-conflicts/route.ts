import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { logOrgAuditBatch } from "@/lib/audit/org-audit"
import { ResolveManagerConflictSchema } from '@/lib/validations/org'
import { OrgHealthSignalType } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = ResolveManagerConflictSchema.parse(await req.json())
    const { personId, keepManagerId, removeManagerId } = body;

    // Fetch links to delete for audit logging
    const linksToDelete = await prisma.personManagerLink.findMany({
      where: { workspaceId, personId, managerId: { not: keepManagerId } },
      select: { id: true, personId: true, managerId: true },
    })

    // Remove all other manager links for this person (v0)
    await prisma.personManagerLink.deleteMany({
      where: { workspaceId, personId, managerId: { not: keepManagerId } },
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
        workspaceId,
        type: "DATA_QUALITY" as OrgHealthSignalType,
        resolvedAt: null,
        dismissedAt: null,
        title: "Manager link conflict",
        contextType: "PERSON",
        contextId: personId,
      },
      data: { resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}
