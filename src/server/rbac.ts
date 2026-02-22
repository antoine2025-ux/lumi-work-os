import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getSessionUser } from "./auth";
import { getActiveOrgContext } from "./orgContext";
import { NextRequest } from "next/server";

export async function getOrgContext(request?: NextRequest) {
  const user = await getSessionUser();
  if (!user) return { user: null, orgId: null, orgName: null, role: "VIEWER" as const, canEdit: false, canAdmin: false };

  // Pass the request to getActiveOrgContext so it can fall back to workspace-based orgs
  const ctx = await getActiveOrgContext(request);
  const orgId = ctx.orgId;
  const orgName = ctx.orgName;
  const role = (ctx.role ?? "VIEWER") as string;

  const canEdit = role === "EDITOR" || role === "ADMIN";
  const canAdmin = role === "ADMIN";

  // Set workspace context for Prisma scoping middleware
  // orgId is the workspaceId in workspace-based org resolution
  if (orgId) {
    setWorkspaceContext(orgId);
  }

  return { user, orgId, orgName, role, canEdit, canAdmin };
}

export function requireEdit(canEdit: boolean) {
  if (!canEdit) {
    const err = new Error("FORBIDDEN") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

export function requireAdmin(canAdmin: boolean) {
  if (!canAdmin) {
    const err = new Error("FORBIDDEN") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}
