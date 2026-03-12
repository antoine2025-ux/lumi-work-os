/**
 * GET /api/org/loopbrain/context
 * 
 * Returns consolidated Org context for Loopbrain ingestion.
 * Includes readiness, counts, intelligence snapshot, and recommendations.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { buildLoopbrainOrgContext } from "@/server/org/loopbrainContext/build";
import { buildLoopbrainOrgContextV2 } from "@/server/org/loopbrainContext/build_v2";
import { handleApiError } from "@/lib/api-errors"

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

    // Version negotiation: default to v1, allow v2 via header or query param
    const queryVersion = request.nextUrl.searchParams.get("version");
    const headerVersion = request.headers.get("x-loopbrain-context-version");
    const requestedVersion = (queryVersion || headerVersion || "v1").toLowerCase().trim();

    try {
      if (requestedVersion === "v2") {
        const context = await buildLoopbrainOrgContextV2();
        return NextResponse.json({ context }, { status: 200 });
      } else {
        // Default: v1
        const context = await buildLoopbrainOrgContext();
        return NextResponse.json({ context }, { status: 200 });
      }
    } catch (buildError: unknown) {
      // Validation errors from buildLoopbrainOrgContext should surface as 500
      // (validation failure means the payload is malformed, which is an internal error)
      console.error("[GET /api/org/loopbrain/context] Context build/validation error:", buildError);
      return NextResponse.json({ error: "Loopbrain context invalid" }, { status: 500 });
    }
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

