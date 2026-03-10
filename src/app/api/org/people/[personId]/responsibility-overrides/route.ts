/**
 * GET/POST /api/org/people/[personId]/responsibility-overrides
 *
 * Phase K: Person Responsibility Overrides
 *
 * GET: List overrides for person
 * POST: Add override
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import {
  getPersonResponsibilityOverrides,
  addPersonResponsibilityOverride,
} from "@/lib/org/responsibility/read";
import { AddResponsibilityOverrideSchema } from "@/lib/validations/org";

type RouteParams = { params: Promise<{ personId: string }> };

// ============================================================================
// GET /api/org/people/[personId]/responsibility-overrides
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { personId } = await params;

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

    const overrides = await getPersonResponsibilityOverrides(workspaceId, personId);

    // Map to response format
    const response = overrides.map((o) => ({
      id: o.id,
      personId: o.personId,
      tagId: o.tagId,
      tagKey: o.tag.key,
      tagLabel: o.tag.label,
      reason: o.reason,
      expiresAt: o.expiresAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, overrides: response });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

// ============================================================================
// POST /api/org/people/[personId]/responsibility-overrides
// ============================================================================

type AddOverrideBody = {
  tagId: string;
  reason?: string;
  expiresAt?: string;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { personId } = await params;

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

    const body = AddResponsibilityOverrideSchema.parse(await request.json());

    const override = await addPersonResponsibilityOverride({
      workspaceId,
      personId,
      tagId: body.tagId,
      reason: body.reason,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdById: userId,
    });

    return NextResponse.json({ ok: true, override });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
