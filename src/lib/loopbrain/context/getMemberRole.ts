/**
 * Look up a user's workspace role for Loopbrain context filtering.
 *
 * Returns the WorkspaceRole enum value ("OWNER" | "ADMIN" | "MEMBER" | "VIEWER").
 * Falls back to "MEMBER" if the membership record is not found (defensive).
 */

import { prisma } from "@/lib/db";
import type { WorkspaceRole } from "@prisma/client";

export async function getMemberRole(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole> {
  if (!workspaceId || !userId) return "MEMBER";

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });

  return member?.role ?? "MEMBER";
}
