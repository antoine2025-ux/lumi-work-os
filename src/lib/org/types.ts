/**
 * Org Module Type Definitions
 * 
 * The Org feature uses workspaceId as the canonical identifier.
 * A workspace IS the org in this codebase.
 */

/**
 * WorkspaceId is the canonical identifier for organizations.
 */
export type WorkspaceId = string

/**
 * Legacy type alias - use WorkspaceId instead.
 * @deprecated Use WorkspaceId directly
 */
export type OrgId = WorkspaceId

/**
 * Type guard for consistency
 */
export function workspaceIdToOrgId(workspaceId: WorkspaceId): OrgId {
  return workspaceId // They're the same
}

