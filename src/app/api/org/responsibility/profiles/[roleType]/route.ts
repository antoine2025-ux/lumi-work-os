/**
 * GET/PATCH/DELETE /api/org/responsibility/profiles/[roleType]
 *
 * Phase K: Single Profile Operations
 *
 * GET: Get profile with expanded tags
 * PATCH: Update tag relations
 * DELETE: Remove profile
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getRoleResponsibilityProfile,
  updateRoleResponsibilityProfile,
  deleteRoleResponsibilityProfile,
} from "@/lib/org/responsibility/read";

type RouteParams = { params: Promise<{ roleType: string }> };

// ============================================================================
// GET /api/org/responsibility/profiles/[roleType]
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roleType } = await params;
    const decodedRoleType = decodeURIComponent(roleType);

    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const profile = await getRoleResponsibilityProfile(workspaceId, decodedRoleType);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error: unknown) {
    console.error("[GET /api/org/responsibility/profiles/[roleType]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/org/responsibility/profiles/[roleType]
// ============================================================================

type UpdateProfileBody = {
  minSeniority?: string | null;
  maxSeniority?: string | null;
  primaryTagIds?: string[];
  allowedTagIds?: string[];
  forbiddenTagIds?: string[];
};

/**
 * Validate tag set consistency for update.
 * Returns error message if invalid, null if valid.
 */
function validateTagConsistency(body: UpdateProfileBody): string | null {
  const forbiddenSet = new Set(body.forbiddenTagIds ?? []);
  const primarySet = new Set(body.primaryTagIds ?? []);
  const allowedSet = new Set(body.allowedTagIds ?? []);

  // Check: primary AND forbidden conflict
  for (const tagId of primarySet) {
    if (forbiddenSet.has(tagId)) {
      return `Tag cannot be both primary and forbidden (tagId: ${tagId})`;
    }
  }

  // Check: allowed AND forbidden conflict
  for (const tagId of allowedSet) {
    if (forbiddenSet.has(tagId)) {
      return `Tag cannot be both allowed and forbidden (tagId: ${tagId})`;
    }
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { roleType } = await params;
    const decodedRoleType = decodeURIComponent(roleType);

    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    setWorkspaceContext(workspaceId);

    const body = (await request.json()) as UpdateProfileBody;

    // Validate tag consistency: no tag in both allowed/primary AND forbidden
    const validationError = validateTagConsistency(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const profile = await updateRoleResponsibilityProfile(workspaceId, decodedRoleType, body);

    return NextResponse.json({ ok: true, profile });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.error("[PATCH /api/org/responsibility/profiles/[roleType]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/org/responsibility/profiles/[roleType]
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { roleType } = await params;
    const decodedRoleType = decodeURIComponent(roleType);

    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    setWorkspaceContext(workspaceId);

    await deleteRoleResponsibilityProfile(workspaceId, decodedRoleType);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.error("[DELETE /api/org/responsibility/profiles/[roleType]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
