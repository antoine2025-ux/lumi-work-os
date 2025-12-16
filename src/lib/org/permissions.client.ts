"use client";

import { OrgCapability, hasOrgCapability, OrgRole } from "./capabilities";

export type OrgClientPermissions = {
  role: OrgRole;
};

export function canClient(
  perms: OrgClientPermissions | null,
  capability: OrgCapability
): boolean {
  if (!perms) return false;
  return hasOrgCapability(perms.role, capability);
}

