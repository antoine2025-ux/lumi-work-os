/**
 * Loopbrain Insights Dismiss API
 *
 * POST: Dismiss one or more insights
 *
 * @see src/lib/loopbrain/contract/proactiveInsight.v0.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { buildLogContextFromRequest } from "@/lib/request-context";
import { handleApiError } from "@/lib/api-errors";
import { z } from "zod";

// Validation schema
const dismissRequestSchema = z.object({
  insightIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/loopbrain/insights/dismiss
 *
 * Dismiss one or more insights.
 *
 * Request body:
 * {
 *   "insightIds": ["uuid1", "uuid2", ...],
 *   "reason": "Optional dismissal reason"
 * }
 *
 * Response:
 * {
 *   "dismissed": number,
 *   "insightIds": string[]
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info(
    "Incoming request POST /api/loopbrain/insights/dismiss",
    baseContext
  );

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parseResult = dismissRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { insightIds, reason } = parseResult.data;

    // Verify insights belong to this workspace
    const existingInsights = await prisma.proactiveInsight.findMany({
      where: {
        id: { in: insightIds },
        workspaceId: auth.workspaceId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const validIds = existingInsights.map((i) => i.id);

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "No valid active insights found to dismiss" },
        { status: 404 }
      );
    }

    // Dismiss insights
    const now = new Date();
    const result = await prisma.proactiveInsight.updateMany({
      where: {
        id: { in: validIds },
        workspaceId: auth.workspaceId,
      },
      data: {
        status: "DISMISSED",
        dismissedAt: now,
        dismissedBy: auth.user.userId,
        dismissalReason: reason || null,
      },
    });

    const durationMs = Date.now() - startTime;
    logger.info("POST /api/loopbrain/insights/dismiss completed", {
      ...baseContext,
      dismissedCount: result.count,
      requestedCount: insightIds.length,
      durationMs,
    });

    return NextResponse.json({
      dismissed: result.count,
      insightIds: validIds,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
