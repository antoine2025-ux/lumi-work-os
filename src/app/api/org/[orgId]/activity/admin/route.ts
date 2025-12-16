import { NextRequest, NextResponse } from "next/server";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { listOrgAuditForOrg } from "@/lib/orgAudit";
import type { OrgAdminActivityItem } from "@/types/org";

type AdminActivityResponse =
  | {
      ok: true;
      data: OrgAdminActivityItem[];
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<AdminActivityResponse>> {
  const resolvedParams = await params;
  const orgId = resolvedParams.orgId;

  if (!orgId) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "MISSING_ORG_ID", message: "Organization id is required." },
      },
      { status: 400 }
    );
  }

  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:activity:view");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "You are not allowed to view activity for this org.",
          },
        },
        { status }
      );
    }

    // Verify orgId matches context
    if (context!.orgId !== orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ORG_MISMATCH",
            message: "Organization ID mismatch.",
          },
        },
        { status: 400 }
      );
    }

    const logs = await listOrgAuditForOrg(orgId, 24);

    const items: OrgAdminActivityItem[] = logs.map((log: any) => ({
      id: log.id,
      action: log.action,
      targetType: log.entityType,
      targetId: log.entityId,
      meta: log.metadata as any,
      createdAt: log.createdAt.toISOString(),
      actor: log.actor
        ? {
            id: log.actor.id,
            name: log.actor.name ?? null,
            email: log.actor.email ?? null,
          }
        : null,
    }));

    return NextResponse.json({
      ok: true,
      data: items,
    });
  } catch (error) {
    console.error("[org-admin-activity]", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load admin activity.",
        },
      },
      { status: 500 }
    );
  }
}

