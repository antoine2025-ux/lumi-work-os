/**
 * GET/POST /api/org/responsibility/tags
 *
 * Phase K: Responsibility Tags CRUD
 *
 * GET: List all tags (with includeArchived query param)
 * POST: Create tag (validate unique key, uppercase format)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import {
  getResponsibilityTags,
  createResponsibilityTag,
} from "@/lib/org/responsibility/read";
import { ResponsibilityTagCreateSchema } from '@/lib/validations/responsibility';

// ============================================================================
// GET /api/org/responsibility/tags
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

    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("includeArchived") === "true";

    const tags = await getResponsibilityTags(workspaceId, includeArchived);

    return NextResponse.json({ ok: true, tags });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

// ============================================================================
// POST /api/org/responsibility/tags
// ============================================================================

type CreateTagBody = {
  key: string;
  label: string;
  description?: string;
  category?: string;
};

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

    const body = ResponsibilityTagCreateSchema.parse(await request.json());

    const tag = await createResponsibilityTag({
      workspaceId,
      key: body.key,
      label: body.label,
      description: body.description,
      category: body.category,
    });

    return NextResponse.json({ ok: true, tag });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
