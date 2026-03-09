/**
 * Resource-level ACL for Loopbrain agent tools.
 *
 * Delegates to existing Prisma models (ProjectMember, SpaceMember)
 * and the assertAccess helper. Admins/Owners bypass resource checks.
 */

import { prisma } from '@/lib/db'
import type { AgentContext } from '../agent/types'
import { LoopbrainPermissionError, hasToolRole } from './index'

/**
 * Assert the user has membership in the given project.
 * ADMIN/OWNER bypass this check (they have workspace-wide access).
 */
export async function assertProjectMembership(
  context: AgentContext,
  projectId: string,
): Promise<void> {
  if (hasToolRole(context, 'ADMIN')) return

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: context.userId },
    },
    select: { id: true },
  })

  if (member) return

  // Fallback: check if user is the project creator/owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true, ownerId: true },
  })

  if (project && (project.createdById === context.userId || project.ownerId === context.userId)) {
    return
  }

  throw new LoopbrainPermissionError(
    'RESOURCE_DENIED',
    `User does not have access to project ${projectId}`,
  )
}

/**
 * Assert the user has membership in the given space.
 * ADMIN/OWNER bypass this check.
 */
export async function assertSpaceMembership(
  context: AgentContext,
  spaceId: string,
): Promise<void> {
  if (hasToolRole(context, 'ADMIN')) return

  const member = await prisma.spaceMember.findFirst({
    where: { spaceId, userId: context.userId },
    select: { id: true },
  })

  if (!member) {
    throw new LoopbrainPermissionError(
      'RESOURCE_DENIED',
      `User does not have access to space ${spaceId}`,
    )
  }
}

/**
 * Get all project IDs the user has access to.
 * ADMIN/OWNER get all workspace projects.
 */
export async function getAccessibleProjectIds(context: AgentContext): Promise<string[]> {
  if (hasToolRole(context, 'ADMIN')) {
    const projects = await prisma.project.findMany({
      where: { workspaceId: context.workspaceId },
      select: { id: true },
    })
    return projects.map((p) => p.id)
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: context.userId, workspaceId: context.workspaceId },
    select: { projectId: true },
  })

  const created = await prisma.project.findMany({
    where: {
      workspaceId: context.workspaceId,
      OR: [
        { createdById: context.userId },
        { ownerId: context.userId },
      ],
    },
    select: { id: true },
  })

  return [...new Set([
    ...memberships.map((m) => m.projectId),
    ...created.map((p) => p.id),
  ])]
}
