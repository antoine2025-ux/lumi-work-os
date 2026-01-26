/**
 * GET/POST /api/org/responsibility/profiles
 *
 * Phase K: Role Responsibility Profiles CRUD
 *
 * GET: List all profiles
 * POST: Create profile with tag relations
 *   - Hard invariant: One profile per roleType per workspace
 *   - On duplicate, return 409
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getRoleResponsibilityProfiles,
  createRoleResponsibilityProfile,
} from "@/lib/org/responsibility/read";

// ============================================================================
// GET /api/org/responsibility/profiles
// ============================================================================

export async function GET(request: NextRequest) {
  try {
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

    const profiles = await getRoleResponsibilityProfiles(workspaceId);

    return NextResponse.json({ ok: true, profiles });
  } catch (error: unknown) {
    console.error("[GET /api/org/responsibility/profiles] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/org/responsibility/profiles
// ============================================================================

type CreateProfileBody = {
  roleType: string;
  minSeniority?: string;
  maxSeniority?: string;
  primaryTagIds?: string[];
  allowedTagIds?: string[];
  forbiddenTagIds?: string[];
};

/**
 * Validate tag set consistency.
 * Returns error message if invalid, null if valid.
 */
function validateTagConsistency(body: CreateProfileBody): string | null {
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

export async function POST(request: NextRequest) {
  try {
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

    const body = (await request.json()) as CreateProfileBody;

    if (!body.roleType) {
      return NextResponse.json(
        { error: "Missing required field: roleType" },
        { status: 400 }
      );
    }

    // Validate tag consistency: no tag in both allowed/primary AND forbidden
    const validationError = validateTagConsistency(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const profile = await createRoleResponsibilityProfile({
      workspaceId,
      roleType: body.roleType,
      minSeniority: body.minSeniority,
      maxSeniority: body.maxSeniority,
      primaryTagIds: body.primaryTagIds,
      allowedTagIds: body.allowedTagIds,
      forbiddenTagIds: body.forbiddenTagIds,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error: unknown) {
    // Handle unique constraint violation (hard invariant)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      const body = await request.clone().json() as CreateProfileBody;
      return NextResponse.json(
        { error: `RoleResponsibilityProfile already exists for roleType=${body.roleType}` },
        { status: 409 }
      );
    }

    console.error("[POST /api/org/responsibility/profiles] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
