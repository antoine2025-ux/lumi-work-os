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
import {
  getResponsibilityTags,
  createResponsibilityTag,
} from "@/lib/org/responsibility/read";

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
    console.error("[GET /api/org/responsibility/tags] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const body = (await request.json()) as CreateTagBody;

    if (!body.key || !body.label) {
      return NextResponse.json(
        { error: "Missing required fields: key, label" },
        { status: 400 }
      );
    }

    // Validate key format (uppercase with underscores)
    const normalizedKey = body.key.toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z][A-Z0-9_]*$/.test(normalizedKey)) {
      return NextResponse.json(
        { error: "Key must be uppercase alphanumeric with underscores (e.g., ENGINEERING_BACKEND)" },
        { status: 400 }
      );
    }

    const tag = await createResponsibilityTag({
      workspaceId,
      key: normalizedKey,
      label: body.label,
      description: body.description,
      category: body.category,
    });

    return NextResponse.json({ ok: true, tag });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return NextResponse.json(
        { error: "A tag with this key already exists" },
        { status: 409 }
      );
    }

    console.error("[POST /api/org/responsibility/tags] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
