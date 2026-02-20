"use client";

import { OrgCapability, hasOrgCapability, OrgRole } from "./capabilities";

export type OrgClientPermissions = {
  role: OrgRole;
  workspaceId?: string;
  userId?: string;
};

export function canClient(
  perms: OrgClientPermissions | null,
  capability: OrgCapability
): boolean {
  if (!perms) return false;
  return hasOrgCapability(perms.role, capability);
}

