/**
 * GET/PUT /api/org/intelligence/settings
 * Get or update Org Intelligence settings (thresholds, staleness windows).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 * 
 * GET: Read-only access (workspace MEMBER)
 * PUT: Admin-only access (workspace scope with admin role)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getOrCreateIntelligenceSettings,
  updateIntelligenceSettings,
  validateIntelligenceSettings,
} from "@/server/org/intelligence/settings";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Get settings
    const settings = await getOrCreateIntelligenceSettings();

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/org/intelligence/settings] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (admin-only for updates)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate settings
    const body = await request.json();

    try {
      // Validate before updating
      validateIntelligenceSettings({
        mgmtMediumDirectReports: body.mgmtMediumDirectReports,
        mgmtHighDirectReports: body.mgmtHighDirectReports,
        availabilityStaleDays: body.availabilityStaleDays,
        snapshotFreshMinutes: body.snapshotFreshMinutes,
        snapshotWarnMinutes: body.snapshotWarnMinutes,
      });

      // Update if validation passes
      await updateIntelligenceSettings({
        mgmtMediumDirectReports: body.mgmtMediumDirectReports,
        mgmtHighDirectReports: body.mgmtHighDirectReports,
        availabilityStaleDays: body.availabilityStaleDays,
        snapshotFreshMinutes: body.snapshotFreshMinutes,
        snapshotWarnMinutes: body.snapshotWarnMinutes,
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error: any) {
      // Validation errors return 400
      if (
        error?.message?.includes("must be an integer") ||
        error?.message?.includes("must be greater than") ||
        error?.message?.includes("between") ||
        error?.message?.includes("between 5 and 10080") ||
        error?.message?.includes("between snapshotFreshMinutes and 20160")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      // Re-throw other errors to be caught by outer catch
      throw error;
    }
  } catch (error: any) {
    console.error("[PUT /api/org/intelligence/settings] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

