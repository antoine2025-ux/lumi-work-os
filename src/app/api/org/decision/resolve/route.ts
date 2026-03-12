/**
 * GET /api/org/decision/resolve
 * 
 * Resolve decision authority for a domain.
 * 
 * Query params:
 * - key: Domain key (required)
 * - start: ISO 8601 UTC start time (optional, for availability check)
 * - end: ISO 8601 UTC end time (optional, for availability check)
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { resolveDecisionAuthority } from "@/lib/org/decision/resolveDecisionAuthority";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    // Parse time window if provided
    let timeWindow: { start: Date; end: Date } | undefined;
    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO 8601 UTC" },
          { status: 400 }
        );
      }

      if (end <= start) {
        return NextResponse.json(
          { error: "end must be after start" },
          { status: 400 }
        );
      }

      timeWindow = { start, end };
    } else if (startStr || endStr) {
      return NextResponse.json(
        { error: "Both start and end are required for availability check" },
        { status: 400 }
      );
    }

    // Step 5: Resolve authority
    const result = await resolveDecisionAuthority({
      workspaceId,
      domainKey: key.toUpperCase(),
      timeWindow,
    });

    // Step 6: Format response
    return NextResponse.json({
      ok: true,
      ...result,
      timeWindow: timeWindow
        ? {
            start: timeWindow.start.toISOString(),
            end: timeWindow.end.toISOString(),
          }
        : null,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
