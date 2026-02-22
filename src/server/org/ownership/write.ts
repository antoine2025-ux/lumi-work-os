/**
 * Write services for Org Ownership.
 * 
 * IMPORTANT: These services assume Prisma is already workspace-scoped
 * via setWorkspaceContext(workspaceId) in the calling route handler.
 * Do NOT accept workspaceId as an argument.
 */

import { prisma } from "@/lib/db";
import { resolveOwner } from "@/lib/org/ownership-resolver";

/**
 * Assign ownership to a team or department.
 * Uses findFirst + create/update pattern to avoid complex upsert keys.
 * Note: Audit logging is done by the calling route handler (after mutation).
 * 
 * IMPORTANT: This function assumes Prisma is already workspace-scoped.
 * workspaceId must be obtained from the calling route handler.
 */
export async function assignOwnership(input: {
  workspaceId: string; // Required for resolver call
  entityType: "TEAM" | "DEPARTMENT";
  entityId: string;
  ownerPersonId: string; // User.id (person responsible)
}): Promise<{ id: string; previousOwnerId: string | null }> {
  // Get current owner before assignment (for audit logging)
  const currentResolution = await resolveOwner(
    input.workspaceId,
    input.entityType as "TEAM" | "DEPARTMENT",
    input.entityId
  );
  const previousOwnerId = currentResolution.ownerPersonId || null;

  // Find existing assignment
  const existing = await prisma.ownerAssignment.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
    },
    select: { id: true, ownerPersonId: true },
  });

  let result: { id: string; ownerPersonId: string };
  if (existing) {
    // Update existing
    result = await prisma.ownerAssignment.update({
      where: { id: existing.id },
      data: { ownerPersonId: input.ownerPersonId },
      select: { id: true, ownerPersonId: true },
    });
  } else {
    // Create new (include workspaceId for explicit compliance)
    result = await prisma.ownerAssignment.create({
      data: {
        workspaceId: input.workspaceId,
        entityType: input.entityType,
        entityId: input.entityId,
        ownerPersonId: input.ownerPersonId,
      },
      select: { id: true, ownerPersonId: true },
    });
  }

  return { 
    id: result.id,
    previousOwnerId: existing?.ownerPersonId || previousOwnerId,
  };
}

