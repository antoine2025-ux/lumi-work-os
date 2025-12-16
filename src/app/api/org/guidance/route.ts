import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/rbac";
import { computeOrgGuidance } from "@/server/orgGuidance";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const guidance = await computeOrgGuidance(ctx.orgId);
  return NextResponse.json({ ok: true, guidance });
}

