import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/rbac";
import { ensureDefaultLandingViews, getDefaultViewForRole } from "@/server/orgDefaults";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId || !ctx.user) return NextResponse.json({ ok: false }, { status: 401 });

  await ensureDefaultLandingViews(ctx.orgId);

  // Map permission roles to view roles
  // ADMIN -> EXECUTIVE, EDITOR -> MANAGER, VIEWER -> MEMBER
  let role = "MEMBER";
  if (ctx.role === "ADMIN") {
    role = "EXECUTIVE";
  } else if (ctx.role === "EDITOR") {
    role = "MANAGER";
  }

  const def = await getDefaultViewForRole(ctx.orgId, role);

  return NextResponse.json({ ok: true, viewKey: def?.viewKey || null });
}

