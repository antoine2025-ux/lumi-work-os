import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext, requireAdmin } from "@/server/rbac";
import { buildWeeklyDigest } from "@/server/orgDigest";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const digest = await buildWeeklyDigest(ctx.orgId);
  return NextResponse.json({ ok: true, digest });
}

