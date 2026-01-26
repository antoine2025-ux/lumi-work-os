/**
 * GET/PATCH /api/org/settings/capacity
 *
 * Capacity threshold settings API.
 * GET: Returns current thresholds (falls back to defaults if not set)
 * PATCH: Updates thresholds (admin-only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getWorkspaceThresholdsAsync,
  saveWorkspaceThresholds,
  DEFAULT_CAPACITY_THRESHOLDS_WITH_WINDOW,
} from "@/lib/org/capacity/thresholds";

// ============================================================================
// GET /api/org/settings/capacity
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read access allowed for members (feasibility, issues, intelligence use these)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const thresholds = await getWorkspaceThresholdsAsync(workspaceId);

    return NextResponse.json({
      ok: true,
      thresholds,
      defaults: DEFAULT_CAPACITY_THRESHOLDS_WITH_WINDOW,
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/settings/capacity] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/org/settings/capacity
// ============================================================================

type UpdateThresholdsBody = {
  lowCapacityHoursThreshold?: number;
  overallocationThreshold?: number;
  minCapacityForCoverage?: number;
  issueWindowDays?: number;
};

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-only write access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    setWorkspaceContext(workspaceId);

    const body = (await request.json()) as UpdateThresholdsBody;

    // Validate inputs
    if (body.lowCapacityHoursThreshold !== undefined) {
      if (typeof body.lowCapacityHoursThreshold !== "number" || body.lowCapacityHoursThreshold < 0) {
        return NextResponse.json(
          { error: "lowCapacityHoursThreshold must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (body.overallocationThreshold !== undefined) {
      if (typeof body.overallocationThreshold !== "number" || body.overallocationThreshold <= 0) {
        return NextResponse.json(
          { error: "overallocationThreshold must be a positive number" },
          { status: 400 }
        );
      }
    }

    if (body.minCapacityForCoverage !== undefined) {
      if (typeof body.minCapacityForCoverage !== "number" || body.minCapacityForCoverage < 0) {
        return NextResponse.json(
          { error: "minCapacityForCoverage must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (body.issueWindowDays !== undefined) {
      if (typeof body.issueWindowDays !== "number" || body.issueWindowDays < 1 || body.issueWindowDays > 90) {
        return NextResponse.json(
          { error: "issueWindowDays must be between 1 and 90" },
          { status: 400 }
        );
      }
    }

    const thresholds = await saveWorkspaceThresholds(workspaceId, body);

    return NextResponse.json({
      ok: true,
      thresholds,
      defaults: DEFAULT_CAPACITY_THRESHOLDS_WITH_WINDOW,
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/org/settings/capacity] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
