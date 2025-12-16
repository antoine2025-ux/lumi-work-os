import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertOrgAccess, OrgAuthError } from "@/lib/orgAuth";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

type OverviewStatsResponse =
  | {
      ok: true;
      data: {
        peopleCount: number;
        teamCount: number;
        departmentCount: number;
        openInvitesCount: number;
      };
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
): Promise<NextResponse<OverviewStatsResponse>> {
  const resolvedParams = await params;
  const orgId = resolvedParams.orgId;

  if (!orgId) {
    const response = NextResponse.json(
      {
        ok: false,
        error: { code: "MISSING_ORG_ID", message: "Organization id is required." },
      },
      { status: 400 }
    );
    await recordOrgApiHit(`/api/org/${orgId}/overview`, 400);
    return response;
  }

  // Emergency force-disable check
  if (isOrgCenterForceDisabled()) {
    const response = NextResponse.json(
      {
        ok: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Org Center is temporarily unavailable." },
      },
      { status: 503 }
    );
    await recordOrgApiHit(`/api/org/${orgId}/overview`, 503, orgId);
    return response;
  }

  try {
    // Ensure the user has access to this org.
    await assertOrgAccess(orgId, req);
    // Using actual Prisma model names: WorkspaceMember, OrgTeam, OrgDepartment, OrgInvitation
    const [peopleCount, teamCount, departmentCount, openInvitesCount] =
      await Promise.all([
        prisma.workspaceMember.count({
          where: { workspaceId: orgId },
        }),
        prisma.orgTeam.count({
          where: { workspaceId: orgId, isActive: true },
        }),
        prisma.orgDepartment.count({
          where: { workspaceId: orgId, isActive: true },
        }),
        prisma.orgInvitation.count({
          where: {
            workspaceId: orgId,
            status: "PENDING", // InvitationStatus enum value
          },
        }),
      ]);

    const response = NextResponse.json({
      ok: true,
      data: {
        peopleCount,
        teamCount,
        departmentCount,
        openInvitesCount,
      },
    });
    await recordOrgApiHit(`/api/org/${orgId}/overview`, 200, orgId);
    return response;
  } catch (error) {
    console.error("[org-overview-stats]", error);

    if (error instanceof OrgAuthError) {
      const response = NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
      );
      await recordOrgApiHit(`/api/org/${orgId}/overview`, error.status, orgId);
      return response;
    }

    const response = NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load organization overview stats.",
        },
      },
      { status: 500 }
    );
    await recordOrgApiHit(`/api/org/${orgId}/overview`, 500, orgId);
    return response;
  }
}

