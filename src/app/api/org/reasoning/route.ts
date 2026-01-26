/**
 * GET /api/org/reasoning
 * Get AI-driven recommendations for org health improvements.
 *
 * Phase R: Consumes Phase S snapshot and derives prioritized recommendations.
 * No new truth logic - pure derivation from snapshot signals.
 *
 * SECURITY: workspaceId from auth only, never from query params.
 * See docs/org/reasoning-rules.md for contracts.
 *
 * Query params:
 * - version: API version (default "v1")
 * - limit: Max recommendations (0-50, default 10)
 *
 * Strict auth pattern: getUnifiedAuth → assertAccess → getSnapshot → computeRecommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { getOrgIntelligenceSnapshot, serializeSnapshot } from "@/lib/org/intelligence";
import {
  computeOrgRecommendations,
  REASONING_API_VERSION,
  REASONING_MAX_LIMIT,
  REASONING_DEFAULT_LIMIT,
} from "@/lib/org/reasoning";

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Step 1: Get unified auth (includes workspaceId)
    // SECURITY: workspaceId from auth only
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Parse query params
    const searchParams = request.nextUrl.searchParams;
    const version = searchParams.get("version") ?? REASONING_API_VERSION;
    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam !== null ? parseInt(limitParam, 10) : NaN;
    const limit = !isNaN(parsedLimit)
      ? Math.min(Math.max(0, parsedLimit), REASONING_MAX_LIMIT)
      : REASONING_DEFAULT_LIMIT;

    // Validate version
    if (version !== REASONING_API_VERSION) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNSUPPORTED_VERSION",
            message: `Unsupported API version: ${version}. Supported: ${REASONING_API_VERSION}`,
          },
        },
        { status: 400 }
      );
    }

    // Step 4: Get Phase S snapshot (full snapshot for reasoning)
    const snapshot = await getOrgIntelligenceSnapshot(workspaceId, {
      include: {
        ownership: true,
        structure: true,
        people: true,
        capacity: true,
      },
    });

    // Step 5: Serialize snapshot to DTO
    const snapshotDTO = serializeSnapshot(snapshot);

    // Step 6: Compute recommendations (pure function, no side effects)
    const result = computeOrgRecommendations(snapshotDTO, { limit });

    // Step 7: Return result
    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error & { code?: string };

    // Handle auth errors
    if (!userId || !workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }

    // Handle access denied
    if (err?.message?.includes("Forbidden") || err?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to access this resource",
          },
        },
        { status: 403 }
      );
    }

    // Handle database errors - return degraded response
    if (
      err?.code?.startsWith("P") ||
      err?.message?.includes("prisma") ||
      err?.message?.includes("database")
    ) {
      console.error("[GET /api/org/reasoning] Database error:", err.message);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Unable to fetch recommendations. Please try again later.",
          },
          degraded: true,
        },
        { status: 503 }
      );
    }

    // Generic error
    console.error("[GET /api/org/reasoning] Error:", err);
    console.error("[GET /api/org/reasoning] Error name:", err?.name);
    console.error("[GET /api/org/reasoning] Error message:", err?.message);
    console.error("[GET /api/org/reasoning] Error stack:", err?.stack);
    
    // In development, include error details in response
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: isDev && err?.message 
            ? `An unexpected error occurred: ${err.message}` 
            : "An unexpected error occurred",
          ...(isDev && err?.stack && { stack: err.stack }),
        },
      },
      { status: 500 }
    );
  }
}
