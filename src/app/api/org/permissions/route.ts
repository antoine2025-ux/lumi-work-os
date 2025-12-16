import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  
  // If user is not authenticated, return 401
  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }
  
  // If user is authenticated but has no org membership, return 403 (Forbidden, not Unauthorized)
  if (!ctx.orgId) {
    return NextResponse.json({ 
      ok: false, 
      error: "No organization membership",
      noOrgMembership: true 
    }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    role: ctx.role,
    canEdit: ctx.canEdit,
  });
}
