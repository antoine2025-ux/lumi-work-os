import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import type { OrgPermissionLevel } from "@/lib/orgPermissions";
import { resolveOrgPermissionForCurrentUser } from "@/lib/orgMembership";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";
import { getOrgAndMembershipForUser } from "@/lib/org/context-db";

// Shape of the response consumed by useCurrentOrg.
type CurrentOrgResponse =
  | {
      ok: true;
      data: {
        org: {
          id: string;
          name: string;
        };
        currentMemberRole: OrgPermissionLevel | null;
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export async function GET(request: NextRequest): Promise<NextResponse<CurrentOrgResponse>> {
  // Emergency force-disable check
  if (isOrgCenterForceDisabled()) {
    const response = NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Org Center is temporarily unavailable.",
        },
      },
      { status: 503 }
    );
    await recordOrgApiHit("/api/org/current", 503);
    return response;
  }

  try {
    // Get current user ID first
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be signed in to access Org Center.",
          },
        },
        { status: 401 }
      );
    }

    // Try to get current workspace ID (which is the orgId in this system)
    let orgId: string | null = null;
    try {
      orgId = await getCurrentWorkspaceId(request);
    } catch (error) {
      // getCurrentWorkspaceId throws if no workspace found
      // We'll fall back to auto-selecting the first org below
      console.log("[org-current] No workspace found, will auto-select first org");
    }

    // Auto-select: If no current workspace, use getOrgAndMembershipForUser to find first org
    let workspace: { id: string; name: string } | null = null;
    let orgIdToUse: string | null = orgId;

    if (orgId) {
      // Use the explicitly selected workspace
      workspace = await prisma.workspace.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!workspace) {
        // Workspace not found, fall back to auto-selection
        orgIdToUse = null;
      }
    }

    // Auto-select first org if no workspace was found or selected
    if (!workspace) {
      const orgAndMembership = await getOrgAndMembershipForUser(userId, null);
      if (orgAndMembership) {
        orgIdToUse = orgAndMembership.org.id;
        workspace = {
          id: orgAndMembership.org.id,
          name: orgAndMembership.org.name || "Unnamed Organization",
        };
      }
    }

    if (!workspace || !orgIdToUse) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NO_CURRENT_ORG",
            message: "No organization found. Create a workspace to get started.",
          },
        },
        { status: 404 }
      );
    }

    const permission = await resolveOrgPermissionForCurrentUser(orgIdToUse, request);

    const response = NextResponse.json({
      ok: true,
      data: {
        org: {
          id: workspace.id,
          name: workspace.name,
        },
        currentMemberRole: permission?.permissionLevel ?? null,
      },
    });

    await recordOrgApiHit("/api/org/current", 200, orgIdToUse, permission?.userId ?? null);
    return response;
  } catch (error) {
    console.error("[org-current]", error);
    const response = NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to resolve current organization.",
        },
      },
      { status: 500 }
    );
    await recordOrgApiHit("/api/org/current", 500);
    return response;
  }
}

