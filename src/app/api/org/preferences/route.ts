/**
 * GET/PUT /api/org/preferences
 * Get or update Org UI preferences (per-user, per-workspace).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getOrgPreferenceForUser, setOrgPreferenceForUser } from "@/server/org/preferences";

const KEY_INTELLIGENCE_FILTERS = "org.intelligence.filters.v1";

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

    const prefs = await getOrgPreferenceForUser<any>({
      workspaceId,
      userId,
      key: KEY_INTELLIGENCE_FILTERS,
    });

    return NextResponse.json(
      { key: KEY_INTELLIGENCE_FILTERS, value: prefs },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET /api/org/preferences] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();

    // Only allow saving known key
    if (body?.key !== KEY_INTELLIGENCE_FILTERS) {
      return NextResponse.json({ error: "Invalid preference key" }, { status: 400 });
    }

    // Basic shape validation to prevent garbage
    const value = body?.value ?? null;
    if (value && typeof value !== "object") {
      return NextResponse.json({ error: "Invalid preference value" }, { status: 400 });
    }

    await setOrgPreferenceForUser({
      workspaceId,
      userId,
      key: KEY_INTELLIGENCE_FILTERS,
      valueJson: value,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("[PUT /api/org/preferences] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

