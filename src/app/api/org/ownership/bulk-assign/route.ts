import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { handleApiError } from "@/lib/api-errors"
import { assertWriteAllowed } from "@/server/org/writes/guard"
import { BulkAssignOwnershipSchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    const userId = auth?.user?.userId
    const workspaceId = auth.workspaceId
    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] })
    assertWriteAllowed("ownership.bulkAssign")
    
    const body = BulkAssignOwnershipSchema.parse(await req.json());
    
    // Process each assignment
    for (const assignment of body.assignments) {
      const entityType = assignment.entityType.toUpperCase() as "TEAM" | "DEPARTMENT" | "PROJECT" | "POSITION";
      const ownerPersonId = assignment.ownerId;
      const entityIds = [assignment.entityId];

      // Demote existing primaries
      await prisma.ownerAssignment.updateMany({
        where: { workspaceId, entityType: entityType as any, entityId: { in: entityIds }, isPrimary: true } as any,
        data: { isPrimary: false },
      })

      // Create new primaries
      await prisma.ownerAssignment.createMany({
        data: entityIds.map((id) => ({
          workspaceId,
          entityType: entityType as any,
          entityId: id,
          ownerPersonId,
          isPrimary: true,
        })),
        skipDuplicates: true as any,
      })

      // Resolve matching OWNERSHIP signals for those entities only
      await prisma.orgHealthSignal.updateMany({
        where: {
          orgId: workspaceId,
          type: "OWNERSHIP" as any,
          resolvedAt: null,
          dismissedAt: null,
          contextType: entityType,
          contextId: { in: entityIds },
        } as any,
        data: { resolvedAt: new Date() },
      })
    }

    revalidateTag("org:ownership", "default")
    revalidateTag("org:health", "default")
    revalidateTag("org:contracts", "default")

    return NextResponse.json({ ok: true, count: body.assignments.length })
  } catch (error) {
    return handleApiError(error, req)
  }
}

