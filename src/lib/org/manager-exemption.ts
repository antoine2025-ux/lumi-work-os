/**
 * Centralized Manager Exemption Logic
 * 
 * Defines who is exempt from requiring a manager (e.g., CEO, workspace owner, executives).
 * This logic must live in ONE place to avoid duplication across API, issue derivation, and UI filters.
 * 
 * SCHEMA CHECK: All ID comparisons are like-for-like (User.id === User.id)
 * - workspace.ownerId is User.id
 * - orgPosition.userId is User.id
 * - All comparisons use User.id (same type)
 */

import { prisma } from "@/lib/db";

/**
 * Check if a person (by userId) is exempt from requiring a manager.
 * 
 * Exemptions:
 * 1. Workspace owner (workspace.ownerId === userId)
 * 2. Executives (orgPosition.level === 1)
 * 
 * @param userId - User.id (not personId)
 * @param workspaceId - Workspace ID
 * @returns true if person is exempt from manager requirement
 */
export async function isPersonManagerExempt(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  // Check if workspace owner (both are User.id, direct comparison OK)
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  
  if (workspace?.ownerId === userId) {
    return true; // Workspace owner is exempt
  }

  // Check if executive (level === 1) - userId is User.id, position.userId is User.id
  const position = await prisma.orgPosition.findFirst({
    where: {
      userId: userId, // Direct comparison: both User.id
      workspaceId,
      level: 1, // Executive level
      isActive: true,
    },
    select: { id: true }, // Minimal select for existence check
  });

  if (position) {
    return true; // Executive is exempt
  }

  return false; // Not exempt
}

/**
 * Batch check manager exemptions for multiple users (for performance).
 * 
 * @param userIds - Array of User.id values
 * @param workspaceId - Workspace ID
 * @returns Map of userId -> boolean (true if exempt)
 */
export async function batchIsPersonManagerExempt(
  userIds: string[],
  workspaceId: string
): Promise<Map<string, boolean>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const results = new Map<string, boolean>();

  // Get workspace owner (once)
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  const workspaceOwnerId = workspace?.ownerId || null;

  // Check all positions in one query
  const executivePositions = await prisma.orgPosition.findMany({
    where: {
      userId: { in: userIds },
      workspaceId,
      level: 1, // Executive level
      isActive: true,
    },
    select: { userId: true },
  });

  const executiveUserIds = new Set(executivePositions.map((p) => p.userId));

  // Build exemption map
  for (const userId of userIds) {
    const isOwner = workspaceOwnerId === userId;
    const isExecutive = executiveUserIds.has(userId);
    results.set(userId, isOwner || isExecutive);
  }

  return results;
}
