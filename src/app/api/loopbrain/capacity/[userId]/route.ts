/**
 * Loopbrain Capacity API (by user)
 *
 * GET: Retrieve unified capacity snapshot for a user.
 * Returns UnifiedCapacitySnapshotV0.
 *
 * @see src/lib/loopbrain/context-sources/capacity.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { logger } from "@/lib/logger";
import { buildLogContextFromRequest } from "@/lib/request-context";
import { handleApiError } from "@/lib/api-errors";
import { buildUnifiedCapacity } from "@/lib/loopbrain/context-sources/capacity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId);

    const { userId } = await params;

    const snapshot = await buildUnifiedCapacity(auth.workspaceId, userId);

    logger.info("GET /api/loopbrain/capacity/[userId] completed", {
      ...baseContext,
      userId,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
