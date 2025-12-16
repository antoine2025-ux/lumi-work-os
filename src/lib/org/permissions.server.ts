import { OrgRole, OrgCapability, hasOrgCapability, getEffectiveCapabilities } from "./capabilities";
import { getOrgAndMembershipForUser } from "./context-db";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { NextRequest } from "next/server";
import { cache } from "react";

export type OrgCustomRoleContext = {
  id: string;
  key: string;
  name: string;
  capabilities: OrgCapability[];
};

export type OrgPermissionContext = {
  userId: string;
  orgId: string;
  role: OrgRole;
  customRole?: OrgCustomRoleContext;
};

/**
 * Resolve the current user's org permission context.
 *
 * IMPORTANT:
 * - This uses your auth helper + Prisma membership.
 * - Uses `Workspace` and `WorkspaceMember` models (workspaceId = orgId).
 * - Gets current workspace from `getCurrentWorkspaceId()` (from unified auth).
 * 
 * PERFORMANCE NOTE:
 * - This function is cached per-request using React.cache() to avoid duplicate
 *   database queries when called from both layout and page components.
 * - NOT cached across requests (TTL) for security - permissions must be fresh.
 * - The cache is request-scoped, so it's safe for auth/permissions.
 */
export const getOrgPermissionContext = cache(async (
  request?: NextRequest
): Promise<OrgPermissionContext | null> => {
  try {
    // 1) Get the current authenticated user
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return null;
    }

    // 2) Get the current workspace (org) ID from auth context
    let currentOrgId: string | null = null;
    try {
      currentOrgId = await getCurrentWorkspaceId(request);
    } catch (error) {
      // If no workspace is set, we'll fall back to first membership
      console.warn("[getOrgPermissionContext] No current workspace, will use first membership");
    }

    // 3) Resolve user's current org + membership.
    const orgAndMembership = await getOrgAndMembershipForUser(userId, currentOrgId);
    if (!orgAndMembership) return null;

    const { org, membership } = orgAndMembership;

    // 4) Map membership.role from DB → OrgRole union
    // WorkspaceRole enum: OWNER | ADMIN | MEMBER | VIEWER
    // OrgRole: OWNER | ADMIN | MEMBER
    // Note: Workspace ownership is already handled in getOrgAndMembershipForUser
    const normalizedRole = normalizeOrgRoleFromDb(membership.role);
    const customRole = parseCustomRole(membership.customRole);

    return {
      userId,
      orgId: org.id,
      role: normalizedRole,
      customRole,
    };
  } catch (error) {
    // Gracefully handle database errors or other failures
    // Log the error but don't crash - return null to show no-access UI
    console.error("[getOrgPermissionContext] Error resolving permission context:", error);
    return null;
  }
});

function normalizeOrgRoleFromDb(dbRole: string): OrgRole {
  const upper = dbRole.toUpperCase();

  if (upper === "OWNER") return "OWNER";
  if (upper === "ADMIN") return "ADMIN";

  // MEMBER and VIEWER both map to MEMBER for Org Center permissions
  return "MEMBER";
}

function parseCustomRole(
  dbCustomRole: { id: string; key: string; name: string; capabilities: any } | null | undefined
): OrgCustomRoleContext | undefined {
  if (!dbCustomRole) return undefined;

  const raw = dbCustomRole.capabilities;
  let caps: OrgCapability[] = [];

  if (Array.isArray(raw)) {
    caps = raw.filter((c): c is OrgCapability => typeof c === "string");
  } else if (raw && typeof raw === "object" && Array.isArray(raw.values)) {
    caps = raw.values.filter((c: unknown): c is OrgCapability => typeof c === "string");
  }

  return {
    id: dbCustomRole.id,
    key: dbCustomRole.key,
    name: dbCustomRole.name,
    capabilities: caps,
  };
}

/**
 * Throws an Error if the context is missing or the capability is not granted.
 * Use this in server-only code and wrap it in try/catch in API routes.
 */
export function assertOrgCapability(
  context: OrgPermissionContext | null,
  capability: OrgCapability
): void {
  if (!context) {
    throw new Error("NO_CONTEXT");
  }

  const { role, customRole } = context;
  const effective = getEffectiveCapabilities(role, customRole);
  
  if (!effective.combined.has(capability)) {
    throw new Error(`MISSING_CAPABILITY:${capability}`);
  }
}

export function can(
  context: OrgPermissionContext | null,
  capability: OrgCapability
): boolean {
  if (!context) return false;
  const effective = getEffectiveCapabilities(context.role, context.customRole);
  return effective.combined.has(capability);
}

/**
 * Utility for API routes: convert permission errors into HTTP responses.
 *
 * - If NO_CONTEXT → 401 Unauthorized
 * - If MISSING_CAPABILITY → 403 Forbidden
 * - Otherwise → 500
 */
export function mapPermissionErrorToStatus(error: unknown): number {
  if (error instanceof Error) {
    if (error.message === "NO_CONTEXT") return 401;
    if (error.message.startsWith("MISSING_CAPABILITY:")) return 403;
  }
  return 500;
}

