/**
 * Org Module Type Definitions
 * 
 * IMPORTANT: In this codebase, orgId and workspaceId are equivalent.
 * The Org feature uses workspaceId as the canonical identifier, but
 * many functions accept orgId as a parameter for backward compatibility
 * and API ergonomics. Internally, orgId is always treated as workspaceId.
 * 
 * This is a critical assumption for merging into Loopwell 2.0.
 * If Loopwell 2.0 has different org/workspace separation, this contract
 * must be re-evaluated.
 */

/**
 * OrgId is an alias for WorkspaceId in this codebase.
 * They represent the same entity - a workspace IS the org.
 */
export type OrgId = string
export type WorkspaceId = string

/**
 * Type guard to ensure we're treating IDs consistently
 * In practice, orgId === workspaceId always in this codebase
 */
export function orgIdToWorkspaceId(orgId: OrgId): WorkspaceId {
  return orgId // They're the same
}

/**
 * Type guard for consistency
 */
export function workspaceIdToOrgId(workspaceId: WorkspaceId): OrgId {
  return workspaceId // They're the same
}

