/**
 * GET/PATCH/DELETE /api/org/responsibility/tags/[key]
 *
 * Phase K: Single Tag Operations
 *
 * GET: Get single tag by key
 * PATCH: Update label/description/category
 * DELETE: Archive (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getResponsibilityTagByKey,
  updateResponsibilityTag,
  archiveResponsibilityTag,
} from "@/lib/org/responsibility/read";

type RouteParams = { params: Promise<{ key: string }> };

// ============================================================================
// GET /api/org/responsibility/tags/[key]
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

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

    const tag = await getResponsibilityTagByKey(workspaceId, key);

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tag });
  } catch (error: unknown) {
    console.error("[GET /api/org/responsibility/tags/[key]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/org/responsibility/tags/[key]
// ============================================================================

type UpdateTagBody = {
  label?: string;
  description?: string;
  category?: string;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

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

    const body = (await request.json()) as UpdateTagBody;

    const tag = await updateResponsibilityTag(workspaceId, key, body);

    return NextResponse.json({ ok: true, tag });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    console.error("[PATCH /api/org/responsibility/tags/[key]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/org/responsibility/tags/[key]
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

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

    // Archive (soft delete) - never hard delete
    const tag = await archiveResponsibilityTag(workspaceId, key);

    return NextResponse.json({ ok: true, archived: true, tag });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    console.error("[DELETE /api/org/responsibility/tags/[key]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
