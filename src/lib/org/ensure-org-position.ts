/**
 * Ensures a user has at least one OrgPosition in a workspace so they appear in the org directory.
 * Idempotent: if a position already exists for (workspaceId, userId), does nothing.
 */

import type { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

type PrismaLike = Pick<PrismaClient, 'orgPosition'>

export interface EnsureOrgPositionParams {
  workspaceId: string
  userId: string
  title?: string
  teamId?: string
}

/**
 * Ensures the user has at least one OrgPosition in the workspace.
 * Call after creating WorkspaceMember to close the identity gap.
 * Does not throw; logs on failure so membership creation is not rolled back.
 */
export async function ensureOrgPositionForUser(
  prismaOrTx: PrismaLike,
  params: EnsureOrgPositionParams
): Promise<void> {
  const { workspaceId, userId, title = 'Team Member', teamId } = params

  try {
    const existing = await prismaOrTx.orgPosition.findFirst({
      where: { workspaceId, userId },
      select: { id: true },
    })

    if (existing) {
      return
    }

    await prismaOrTx.orgPosition.create({
      data: {
        workspaceId,
        userId,
        title,
        teamId,
      },
    })
  } catch (error) {
    // Position might already exist from race, or other transient error
    logger.warn('[ensureOrgPositionForUser] Could not create OrgPosition', {
      workspaceId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
