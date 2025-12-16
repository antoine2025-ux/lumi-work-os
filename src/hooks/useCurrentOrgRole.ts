"use client";

import { useCurrentOrg } from "./useCurrentOrg";
import type { OrgPermissionLevel } from "@/lib/orgPermissions";

type UseCurrentOrgRoleResult = {
  role: OrgPermissionLevel;
  isLoading: boolean;
  source: "org" | "fallback";
};

/**
 * Resolves the current member's OrgPermissionLevel for the active org.
 *
 * - Uses `currentMemberRole` from `useCurrentOrg` when available.
 * - Falls back to "OWNER" only when there's no explicit role (useful during transition).
 */
export function useCurrentOrgRole(): UseCurrentOrgRoleResult {
  const { org, currentMemberRole, isLoading } = useCurrentOrg();

  if (isLoading) {
    return {
      role: "OWNER",
      isLoading: true,
      source: "fallback",
    };
  }

  if (!org) {
    // No org selected: behave like member with minimal access
    return {
      role: "MEMBER",
      isLoading: false,
      source: "fallback",
    };
  }

  if (
    currentMemberRole === "OWNER" ||
    currentMemberRole === "ADMIN" ||
    currentMemberRole === "MEMBER"
  ) {
    return {
      role: currentMemberRole,
      isLoading: false,
      source: "org",
    };
  }

  // Transitional fallback while backend is being wired.
  return {
    role: "OWNER",
    isLoading: false,
    source: "fallback",
  };
}
