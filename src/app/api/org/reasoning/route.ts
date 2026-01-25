/**
 * GET /api/org/reasoning
 *
 * Returns org recommendations computed from the intelligence snapshot.
 * Uses the reasoning engine (Phase R) with Phase S snapshot data.
 *
 * Query params:
 * - version: API version (default "v1", returns 400 for unsupported versions)
 * - limit: Max recommendations (default 10, max 50, 0 returns empty)
 *
 * Response:
 * - 200: { ok: true, data: { recommendations, summaries, _meta } }
 * - 400: { ok: false, error: { code: "UNSUPPORTED_VERSION" } }
 * - 401: { ok: false, error: { code: "UNAUTHORIZED" } }
 * - 403: { ok: false, error: { code: "FORBIDDEN" } }
 * - 500: { ok: false, error: { code: "INTERNAL_ERROR" } }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { getOrgIntelligenceSnapshot, serializeSnapshot } from "@/lib/org/intelligence";
import { computeOrgRecommendations } from "@/lib/org/reasoning/engine";
import {
  REASONING_API_VERSION,
  REASONING_DEFAULT_LIMIT,
  REASONING_MAX_LIMIT,
} from "@/lib/org/reasoning/version";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Step 2: Assert access (MEMBER or higher can access reasoning)
    try {
      await assertAccess({
        userId,
        workspaceId,
        scope: "workspace",
        requireRole: ["MEMBER"],
      });
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    // Step 3: Parse query params
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || REASONING_API_VERSION;
    const limitParam = searchParams.get("limit");

    // Step 4: Validate version
    if (version !== REASONING_API_VERSION) {
      return NextResponse.json(
        { ok: false, error: { code: "UNSUPPORTED_VERSION" } },
        { status: 400 }
      );
    }

    // Step 5: Parse and clamp limit
    let limit = REASONING_DEFAULT_LIMIT;
    if (limitParam !== null) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed)) {
        limit = Math.min(Math.max(0, parsed), REASONING_MAX_LIMIT);
      }
      // Invalid limit values use default (no error)
    }

    // Step 6: Get intelligence snapshot
    const snapshot = await getOrgIntelligenceSnapshot(workspaceId);
    const snapshotDTO = serializeSnapshot(snapshot);

    // Step 7: Compute recommendations
    const result = computeOrgRecommendations(snapshotDTO, { limit });

    // Step 8: Return success response
    return NextResponse.json(
      { ok: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/org/reasoning] Error:", error);

    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
