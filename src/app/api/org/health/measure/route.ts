import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { measureOrgHealth } from "@/server/orgHealth";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const res = await measureOrgHealth(ctx.orgId);
  return NextResponse.json({ ok: true, snapshot: res.snapshot });
}

