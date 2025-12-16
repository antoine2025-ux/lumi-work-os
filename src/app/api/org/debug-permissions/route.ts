import { NextRequest, NextResponse } from "next/server";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";

export async function GET(req: NextRequest) {
  const context = await getOrgPermissionContext(req);

  if (!context) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "No org permission context. You might be logged out or not a member of any org.",
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      context,
    },
    { status: 200 }
  );
}

