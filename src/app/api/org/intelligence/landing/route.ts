/**
 * GET /api/org/intelligence/landing
 *
 * Intelligence landing page API.
 * Returns aggregated issues, summaries, thresholds, and metadata.
 *
 * Query params:
 * - start: ISO 8601 UTC start date (optional)
 * - end: ISO 8601 UTC end date (optional)
 *
 * If start/end not provided, uses canonical default window (Next 7 days).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getIntelligenceLanding } from "@/server/org/intelligence/landing";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access - read access for all org members
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse optional time window from query params
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const includeExplainabilityParam = searchParams.get("includeExplainability");

    let timeWindow: { start: Date; end: Date } | undefined;

    if (startParam && endParam) {
      const start = new Date(startParam);
      const end = new Date(endParam);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { ok: false, error: "Invalid date format. Use ISO 8601 UTC." },
          { status: 400 }
        );
      }

      if (start >= end) {
        return NextResponse.json(
          { ok: false, error: "Start date must be before end date." },
          { status: 400 }
        );
      }

      timeWindow = { start, end };
    }

    // Parse includeExplainability (default false for performance)
    const includeExplainability = includeExplainabilityParam === "true";

    // Step 5: Get landing data
    const result = await getIntelligenceLanding(workspaceId, timeWindow, includeExplainability);

    // Step 6: Return response
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/intelligence/landing] Error:", error);

    if (error instanceof Error && error.message.includes("Access denied")) {
      return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
