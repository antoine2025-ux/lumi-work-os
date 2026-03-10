/**
 * Loopbrain Permission Infrastructure
 *
 * Thin adapter layer that bridges the agent execution context with
 * existing auth helpers (assertAccess, assertManagerOrAdmin, etc.).
 * Does NOT duplicate role hierarchy logic — delegates to proven helpers.
 */

import { prisma } from '@/lib/db'
import type { AgentContext, AgentRole, ToolPermissions } from '../agent/types'

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type PermissionErrorCode = 'ROLE_DENIED' | 'RESOURCE_DENIED' | 'HIERARCHY_DENIED'

export class LoopbrainPermissionError extends Error {
  constructor(
    public readonly code: PermissionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'LoopbrainPermissionError'
  }
}

// ---------------------------------------------------------------------------
// Role hierarchy (mirrors assertAccess — single source of truth for levels)
// ---------------------------------------------------------------------------

const ROLE_LEVEL: Record<AgentRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

/**
 * Assert the agent context has at least the required role.
 * @throws LoopbrainPermissionError with code ROLE_DENIED
 */
export function assertToolRole(context: AgentContext, minimumRole: AgentRole): void {
  if (ROLE_LEVEL[context.userRole] < ROLE_LEVEL[minimumRole]) {
    throw new LoopbrainPermissionError(
      'ROLE_DENIED',
      `Action requires ${minimumRole} role, user has ${context.userRole}`,
    )
  }
}

/**
 * Check (non-throwing) whether context meets the minimum role.
 */
export function hasToolRole(context: AgentContext, minimumRole: AgentRole): boolean {
  return ROLE_LEVEL[context.userRole] >= ROLE_LEVEL[minimumRole]
}

// ---------------------------------------------------------------------------
// Context enrichment
// ---------------------------------------------------------------------------

/**
 * Resolve the user's org person ID from OrgPosition.
 * Returns undefined if the user has no active org position.
 */
async function resolvePersonId(userId: string, workspaceId: string): Promise<string | undefined> {
  const position = await prisma.orgPosition.findFirst({
    where: { userId, workspaceId, isActive: true },
    select: { id: true },
  })
  return position?.id
}

/**
 * Build an enriched AgentContext with userRole and personId.
 * Call once per agent loop invocation; pass the result to all tool executions.
 */
export async function enrichAgentContext(
  workspaceId: string,
  userId: string,
  userRole: AgentRole,
  workspaceSlug: string = '',
): Promise<AgentContext> {
  const personId = await resolvePersonId(userId, workspaceId)
  return { workspaceId, userId, workspaceSlug, userRole, personId }
}

// Re-export sub-modules for convenience
export { assertProjectMembership, assertSpaceMembership, getAccessibleProjectIds } from './resource-acl'
export { assertHierarchyAccess, getAccessiblePersonIds } from './hierarchy'
export type { ToolPermissions }
