import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { assertWriteAllowed } from "@/server/org/writes/guard"
import { BulkAssignOwnershipSchema } from '@/lib/validations/org'
import { OrgHealthSignalType, OwnedEntityType } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    const userId = auth?.user?.userId
    const workspaceId = auth.workspaceId
    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] })
    setWorkspaceContext(workspaceId)
    assertWriteAllowed("ownership.bulkAssign")
    
    const body = BulkAssignOwnershipSchema.parse(await req.json());
    
    // Process each assignment
    for (const assignment of body.assignments) {
      const entityType = assignment.entityType.toUpperCase() as OwnedEntityType;
      const ownerPersonId = assignment.ownerId;
      const entityIds = [assignment.entityId];

      // Demote existing primaries
      await prisma.ownerAssignment.updateMany({
        where: { workspaceId, entityType, entityId: { in: entityIds }, isPrimary: true },
        data: { isPrimary: false },
      })

      // Create new primaries
      await prisma.ownerAssignment.createMany({
        data: entityIds.map((id) => ({
          workspaceId,
          entityType,
          entityId: id,
          ownerPersonId,
          isPrimary: true,
        })),
        skipDuplicates: true,
      })

      // Resolve matching OWNERSHIP signals for those entities only
      await prisma.orgHealthSignal.updateMany({
        where: {
          workspaceId,
          type: "OWNERSHIP" as OrgHealthSignalType,
          resolvedAt: null,
          dismissedAt: null,
          contextType: entityType,
          contextId: { in: entityIds },
        },
        data: { resolvedAt: new Date() },
      })
    }

    revalidateTag("org:ownership", "default")
    revalidateTag("org:health", "default")
    revalidateTag("org:contracts", "default")

    return NextResponse.json({ ok: true, count: body.assignments.length })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}

