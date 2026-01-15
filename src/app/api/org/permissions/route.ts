import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOrgContext(req);
    
    // If user is not authenticated, return empty permissions
    if (!ctx.user) {
      return NextResponse.json({
        ok: true,
        role: null,
        canEdit: false,
        hint: "Authentication required to load permissions.",
      }, { status: 200 });
    }
    
    // If user is authenticated but has no org membership, return minimal permissions
    if (!ctx.orgId) {
      return NextResponse.json({ 
        ok: true,
        role: null,
        canEdit: false,
        noOrgMembership: true,
        hint: "No organization membership found.",
      }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      role: ctx.role,
      canEdit: ctx.canEdit,
    });
  } catch (error: any) {
    console.error("[GET /api/org/permissions] Error:", error);
    // Return minimal permissions on error - never break the page
    return NextResponse.json({
      ok: true,
      role: null,
      canEdit: false,
      hint: error?.message || "Failed to load permissions.",
    }, { status: 200 });
  }
}
