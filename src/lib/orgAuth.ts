import type { OrgPermissionLevel, OrgPermissionCapabilityKey } from "./orgPermissions";
import { canRole } from "./orgPermissions";
import { resolveOrgPermissionForCurrentUser } from "./orgMembership";
import { NextRequest } from "next/server";

export class OrgAuthError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
  status: number;

  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Basic org access check:
 * - Ensures there's a current user + membership for the given org.
 * - Returns the resolved OrgPermissionLevel for further checks.
 */
export async function assertOrgAccess(
  orgId: string,
  request?: NextRequest
): Promise<OrgPermissionLevel> {
  if (!orgId) {
    throw new OrgAuthError(
      "FORBIDDEN",
      "Missing organization id for access check.",
      403
    );
  }

  const result = await resolveOrgPermissionForCurrentUser(orgId, request);

  if (!result) {
    // Either unauthenticated or not a member of this org.
    throw new OrgAuthError(
      "FORBIDDEN",
      "You don't have access to this organization.",
      403
    );
  }

  return result.permissionLevel;
}

/**
 * Capability-level check for Org APIs:
 * - Ensures membership exists.
 * - Ensures the resolved role has the required capability.
 *
 * Throws OrgAuthError("FORBIDDEN") when the capability is not allowed.
 */
export async function assertOrgCapability(
  orgId: string,
  capability: OrgPermissionCapabilityKey,
  request?: NextRequest
): Promise<OrgPermissionLevel> {
  const role = await assertOrgAccess(orgId, request);

  const allowed = canRole(role, capability);
  if (!allowed) {
    throw new OrgAuthError(
      "FORBIDDEN",
      "You don't have permission to perform this action.",
      403
    );
  }

  return role;
}
