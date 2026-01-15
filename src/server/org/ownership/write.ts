/**
 * Write services for Org Ownership.
 * 
 * IMPORTANT: These services assume Prisma is already workspace-scoped
 * via setWorkspaceContext(workspaceId) in the calling route handler.
 * Do NOT accept workspaceId as an argument.
 */

import { prisma } from "@/lib/db";

/**
 * Assign ownership to a team or department.
 * Uses findFirst + create/update pattern to avoid complex upsert keys.
 */
export async function assignOwnership(input: {
  entityType: "TEAM" | "DEPARTMENT";
  entityId: string;
  ownerPersonId: string; // User.id (person responsible)
}) {
  // Find existing assignment
  const existing = await prisma.ownerAssignment.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
    },
    select: { id: true },
  });

  if (existing) {
    // Update existing
    const updated = await prisma.ownerAssignment.update({
      where: { id: existing.id },
      data: { ownerPersonId: input.ownerPersonId },
      select: { id: true },
    });
    return { id: updated.id };
  } else {
    // Create new
    const created = await prisma.ownerAssignment.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        ownerPersonId: input.ownerPersonId,
      },
      select: { id: true },
    });
    return { id: created.id };
  }
}

