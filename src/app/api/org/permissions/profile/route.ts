import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getProfilePermissions } from "@/lib/org/permissions/profile-permissions";
import type { ProfileField } from "@/lib/org/permissions/profile-permissions";

const PROFILE_FIELDS: ProfileField[] = [
  "name",
  "email",
  "title",
  "department",
  "team",
  "startDate",
  "employmentType",
  "location",
  "timezone",
  "weeklyCapacity",
  "skills",
  "bio",
];

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId ?? "";

    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");
    const effectiveWorkspaceId = searchParams.get("workspaceId") ?? workspaceId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId required" },
        { status: 400 }
      );
    }

    const permissions = await getProfilePermissions(
      auth.user.userId,
      targetUserId,
      effectiveWorkspaceId
    );

    const canEditField: Record<string, boolean> = {};
    for (const field of PROFILE_FIELDS) {
      canEditField[field] = permissions.canEditField(field);
    }

    return NextResponse.json({
      canEditField,
      canRequestTimeOff: permissions.canRequestTimeOff,
      canApproveTimeOff: permissions.canApproveTimeOff,
      canEditCapacity: permissions.canEditCapacity,
      permissionLevel: permissions.permissionLevel,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
