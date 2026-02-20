// src/lib/org/context/roleId.ts

/**
 * Canonical Role ID Helpers
 * 
 * Provides stable, deterministic Role ID formats used across:
 * - RoleContext
 * - ContextObject (type: "role")
 * - Org graph relations
 * 
 * Format:
 * - For OrgPosition-backed roles: role:{workspaceId}:position:{orgPositionId}
 * - For RoleCard-only roles: role:{workspaceId}:role-card:{roleCardId}
 */

export function buildRoleIdFromPosition(workspaceId: string, positionId: string): string {
  return `role:${workspaceId}:position:${positionId}`;
}

export function buildRoleIdFromRoleCard(workspaceId: string, roleCardId: string): string {
  return `role:${workspaceId}:role-card:${roleCardId}`;
}

/**
 * Fallback for edge cases – not ideal, but better than totally random.
 * Use only when neither a position nor roleCard ID is available.
 */
export function buildFallbackRoleId(workspaceId: string, seed?: string): string {
  const suffix = seed || Math.random().toString(36).slice(2, 10);
  return `role:${workspaceId}:fallback:${suffix}`;
}

export type RoleIdSource =
  | { kind: "position"; workspaceId: string; positionId: string }
  | { kind: "roleCard"; workspaceId: string; roleCardId: string }
  | { kind: "fallback"; workspaceId: string; seed?: string };

/**
 * Centralized builder to keep all role ID construction consistent.
 */
export function buildRoleId(source: RoleIdSource): string {
  switch (source.kind) {
    case "position":
      return buildRoleIdFromPosition(source.workspaceId, source.positionId);
    case "roleCard":
      return buildRoleIdFromRoleCard(source.workspaceId, source.roleCardId);
    case "fallback":
      return buildFallbackRoleId(source.workspaceId, source.seed);
    default: {
      const _: never = source;
      throw new Error('Unhandled RoleIdSource kind');
    }
  }
}

