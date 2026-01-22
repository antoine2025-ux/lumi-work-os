import { prisma } from "@/lib/db";
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
  const role = (ctx.role ?? "VIEWER") as any;

  const canEdit = role === "EDITOR" || role === "ADMIN";
  const canAdmin = role === "ADMIN";

  return { user, orgId, orgName, role, canEdit, canAdmin };
}

export function requireEdit(canEdit: boolean) {
  if (!canEdit) {
    const err = new Error("FORBIDDEN");
    (err as any).status = 403;
    throw err;
  }
}

export function requireAdmin(canAdmin: boolean) {
  if (!canAdmin) {
    const err = new Error("FORBIDDEN");
    (err as any).status = 403;
    throw err;
  }
}
