import { NextResponse } from "next/server";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import {
  ORG_CAPABILITIES_OWNER,
  ORG_CAPABILITIES_ADMIN,
  ORG_CAPABILITIES_READONLY,
} from "@/lib/org/capabilities";

export async function GET() {
  const context = await getOrgPermissionContext();

  return NextResponse.json(
    {
      ok: true,
      context,
      roleCapabilities: {
        OWNER: ORG_CAPABILITIES_OWNER,
        ADMIN: ORG_CAPABILITIES_ADMIN,
        MEMBER: ORG_CAPABILITIES_READONLY,
      },
    },
    { status: 200 }
  );
}

