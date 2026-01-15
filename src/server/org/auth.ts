import type { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";

type OrgScope = "org:read" | "org:write";

/**
 * Canonical Org auth gate.
 * 
 * IMPORTANT: workspaceId is the ONLY tenant identifier. orgId is forbidden.
 * 
 * This function enforces the required auth pattern for all Org routes:
 * 1. getUnifiedAuth(request)
 * 2. assertAccess({ userId, workspaceId, scope, role })
 * 3. setWorkspaceContext(workspaceId)
 * 
 * After calling this, Prisma queries are automatically scoped to workspaceId.
 * 
 * @param request - NextRequest from route handler
 * @param scope - Required scope: "org:read" or "org:write"
 * @param role - Optional role requirement (defaults to "MEMBER")
 * @returns { userId, workspaceId } - Authenticated user and workspace IDs
 * @throws Error if unauthorized or access denied
 */
export async function requireOrgContext(
  request: NextRequest,
  scope: OrgScope,
  role?: string
) {
  // Step 1: Get unified auth (includes workspaceId)
  const auth = await getUnifiedAuth(request);

  const userId = auth?.user?.userId;
  const workspaceId = auth?.workspaceId;

  if (!userId || !workspaceId) {
    const error = new Error("Unauthorized: Authentication required");
    (error as any).status = 401;
    throw error;
  }

  // Step 2: Assert access (verifies workspace membership and role)
  await assertAccess({
    userId,
    workspaceId,
    scope: "workspace", // Org uses workspace scope
    requireRole: role ? [role as any] : ["MEMBER"],
  });

  // Step 3: Set workspace context (enables automatic Prisma scoping)
  setWorkspaceContext(workspaceId);

  return { userId, workspaceId };
}

