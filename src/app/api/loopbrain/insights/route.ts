/**
 * Loopbrain Insights API
 *
 * GET: Retrieve proactive insights for the workspace
 * POST: Trigger insight detection
 *
 * @see src/lib/loopbrain/insight-detector.ts
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
import {
  detectInsights,
  storeInsights,
  expireStaleInsights,
  buildInsightBatch,
} from "@/lib/loopbrain/insight-detector";
import type {
  InsightCategoryV0,
  InsightPriorityV0,
  InsightStatusV0,
  InsightTriggerV0,
  ProactiveInsightV0,
  RecommendationV0,
  InsightEvidenceV0,
  AffectedEntityV0,
  DismissalReasonV0,
} from "@/lib/loopbrain/contract/proactiveInsight.v0";
import { LoopbrainInsightsTriggerSchema } from "@/lib/validations/loopbrain";

/**
 * GET /api/loopbrain/insights
 *
 * Query parameters:
 * - status: Filter by status (ACTIVE, DISMISSED, EXPIRED, SUPERSEDED)
 * - category: Filter by category (CAPACITY, WORKLOAD, PROJECT, etc.)
 * - priority: Filter by priority (CRITICAL, HIGH, MEDIUM, LOW, INFO)
 * - limit: Maximum number of insights to return (default: 50)
 * - offset: Pagination offset (default: 0)
 *
 * Response: InsightBatchV0
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request GET /api/loopbrain/insights", baseContext);

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as InsightStatusV0 | null;
    const category = searchParams.get("category") as InsightCategoryV0 | null;
    const priority = searchParams.get("priority") as InsightPriorityV0 | null;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const where: {
      workspaceId: string;
      status?: InsightStatusV0;
      category?: InsightCategoryV0;
      priority?: InsightPriorityV0;
    } = {
      workspaceId: auth.workspaceId,
    };

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    // Fetch insights
    const [insights, totalCount] = await Promise.all([
      prisma.proactiveInsight.findMany({
        where,
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        skip: offset,
        take: limit,
      }),
      prisma.proactiveInsight.count({ where }),
    ]);

    // Transform to contract format
    const transformedInsights: ProactiveInsightV0[] = insights.map((i) => {
      const insight: ProactiveInsightV0 = {
        id: i.id,
        trigger: i.trigger as InsightTriggerV0,
        category: i.category as InsightCategoryV0,
        priority: i.priority as InsightPriorityV0,
        title: i.title,
        description: i.description,
        confidence: i.confidence,
        recommendations: (i.recommendations as RecommendationV0[]) || [],
        evidence: (i.evidence as InsightEvidenceV0[]) || [],
        affectedEntities: (i.affectedEntities as AffectedEntityV0[]) || [],
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt?.toISOString() || null,
        status: i.status as InsightStatusV0,
      };

      // Add dismissal info if dismissed
      if (i.dismissedAt && i.dismissedBy) {
        insight.dismissal = {
          dismissedAt: i.dismissedAt.toISOString(),
          dismissedBy: i.dismissedBy,
          reason: (i.dismissalReason as DismissalReasonV0) || "OTHER",
        };
      }

      // Add optional fields
      if (i.supersedesId) {
        insight.supersedesId = i.supersedesId;
      }
      if (i.metadata) {
        insight.metadata = i.metadata as Record<string, string | number | boolean | null>;
      }

      return insight;
    });

    // Build batch response
    const batch = buildInsightBatch(auth.workspaceId, transformedInsights);

    // Add pagination info
    const response = {
      ...batch,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + insights.length < totalCount,
      },
    };

    const durationMs = Date.now() - startTime;
    logger.info("GET /api/loopbrain/insights completed", {
      ...baseContext,
      insightCount: insights.length,
      totalCount,
      durationMs,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * POST /api/loopbrain/insights
 *
 * Trigger insight detection for the workspace.
 * Requires ADMIN or OWNER role.
 *
 * Request body:
 * {
 *   "categories": ["CAPACITY", "WORKLOAD", ...] (optional - detect all if not specified)
 *   "minConfidence": 0.5 (optional - minimum confidence threshold)
 *   "maxInsights": 100 (optional - maximum insights to generate)
 *   "store": true (optional - store insights in database, default true)
 * }
 *
 * Response: InsightBatchV0 with detected insights
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request POST /api/loopbrain/insights", baseContext);

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    setWorkspaceContext(auth.workspaceId);

    // Parse request body
    const body = LoopbrainInsightsTriggerSchema.parse(
      await request.json().catch(() => ({}))
    );

    const {
      categories,
      minConfidence = 0.5,
      maxInsights = 100,
      store = true,
    } = body;

    // First, expire any stale insights
    await expireStaleInsights(auth.workspaceId);

    // Detect new insights (includes user-scoped generators)
    const insights = await detectInsights(auth.workspaceId, {
      categories,
      minConfidence,
      maxInsights,
      userId: auth.user.userId,
    });

    // Store insights if requested
    if (store && insights.length > 0) {
      await storeInsights(auth.workspaceId, insights);
    }

    // Build batch response
    const batch = buildInsightBatch(auth.workspaceId, insights);

    const durationMs = Date.now() - startTime;
    logger.info("POST /api/loopbrain/insights completed", {
      ...baseContext,
      insightCount: insights.length,
      stored: store,
      durationMs,
    });

    return NextResponse.json({
      ...batch,
      stored: store,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
