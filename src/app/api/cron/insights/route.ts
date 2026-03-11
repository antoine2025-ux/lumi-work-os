/**
 * Cron Job: Proactive Insights Detection
 *
 * POST /api/cron/insights
 *
 * This endpoint is designed to be called by a cron scheduler (e.g., Vercel Cron,
 * GitHub Actions, or external cron service) to periodically detect and store
 * proactive insights for all active workspaces.
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET (or CRON_SECRET). If unset in production, returns 403.
 *
 * Body (optional):
 * {
 *   "workspaceIds": string[] - Specific workspaces to process (default: all active)
 *   "categories": string[] - Insight categories to detect (default: all)
 *   "minConfidence": number - Minimum confidence threshold (default: 0.5)
 *   "maxInsightsPerWorkspace": number - Max insights per workspace (default: 50)
 * }
 *
 * @see src/lib/loopbrain/insight-detector.ts
 * @see src/lib/loopbrain/contract/proactiveInsight.v0.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  detectInsights,
  storeInsights,
  expireStaleInsights,
} from "@/lib/loopbrain/insight-detector";
import type { InsightCategoryV0 } from "@/lib/loopbrain/contract/proactiveInsight.v0";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for processing multiple workspaces

// =============================================================================
// Auth
// =============================================================================

function getCronSecret(): string | null {
  return (
    process.env.LOOPBRAIN_CRON_SECRET ?? process.env.CRON_SECRET ?? null
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) {
    // Allow in non-production environments without secret
    return process.env.NODE_ENV !== "production";
  }
  const headerSecret =
    request.headers.get("x-cron-secret") ??
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
  return headerSecret === secret;
}

// =============================================================================
// Types
// =============================================================================

interface CronRequestBody {
  workspaceIds?: string[];
  categories?: InsightCategoryV0[];
  minConfidence?: number;
  maxInsightsPerWorkspace?: number;
}

interface WorkspaceResult {
  workspaceId: string;
  ok: boolean;
  insightsDetected?: number;
  insightsStored?: number;
  expiredCount?: number;
  error?: string;
  durationMs?: number;
}

// =============================================================================
// Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Auth check
  if (!isAuthorized(request)) {
    logger.warn("[CronInsights] Unauthorized request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  // Parse request body
  let body: CronRequestBody = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const {
    workspaceIds: requestedWorkspaceIds,
    categories,
    minConfidence = 0.5,
    maxInsightsPerWorkspace = 50,
  } = body;

  logger.info("[CronInsights] Starting insight detection cron job", {
    requestedWorkspaceCount: requestedWorkspaceIds?.length ?? "all",
    categories: categories ?? "all",
    minConfidence,
    maxInsightsPerWorkspace,
  });

  try {
    // Get workspaces to process
    let workspaceIds: string[];

    if (requestedWorkspaceIds && requestedWorkspaceIds.length > 0) {
      // Use provided workspace IDs
      workspaceIds = requestedWorkspaceIds;
    } else {
      // Get all active workspaces (those with at least one member)
      const workspaces = await prisma.workspace.findMany({
        where: {
          members: {
            some: {},
          },
        },
        select: { id: true },
        take: 100, // Limit to prevent runaway processing
      });
      workspaceIds = workspaces.map((w) => w.id);
    }

    if (workspaceIds.length === 0) {
      logger.info("[CronInsights] No workspaces to process");
      return NextResponse.json({
        ok: true,
        message: "No workspaces to process",
        results: [],
        totalDurationMs: Date.now() - startTime,
      });
    }

    // Process each workspace
    const results: WorkspaceResult[] = [];

    for (const workspaceId of workspaceIds) {
      const wsStartTime = Date.now();

      try {
        // Expire stale insights first
        const expiredCount = await expireStaleInsights(workspaceId);

        // Detect new insights
        const insights = await detectInsights(workspaceId, {
          categories,
          minConfidence,
          maxInsights: maxInsightsPerWorkspace,
        });

        // Store insights
        if (insights.length > 0) {
          await storeInsights(workspaceId, insights);
        }

        results.push({
          workspaceId,
          ok: true,
          insightsDetected: insights.length,
          insightsStored: insights.length,
          expiredCount,
          durationMs: Date.now() - wsStartTime,
        });

        logger.info("[CronInsights] Workspace processed", {
          workspaceId,
          insightsDetected: insights.length,
          expiredCount,
          durationMs: Date.now() - wsStartTime,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        results.push({
          workspaceId,
          ok: false,
          error: errorMessage,
          durationMs: Date.now() - wsStartTime,
        });

        logger.error("[CronInsights] Workspace processing failed", {
          workspaceId,
          error,
        });
      }
    }

    // Calculate summary
    const totalDurationMs = Date.now() - startTime;
    const successCount = results.filter((r) => r.ok).length;
    const failureCount = results.filter((r) => !r.ok).length;
    const totalInsightsDetected = results.reduce(
      (sum, r) => sum + (r.insightsDetected ?? 0),
      0
    );
    const totalExpired = results.reduce(
      (sum, r) => sum + (r.expiredCount ?? 0),
      0
    );

    logger.info("[CronInsights] Cron job completed", {
      workspacesProcessed: workspaceIds.length,
      successCount,
      failureCount,
      totalInsightsDetected,
      totalExpired,
      totalDurationMs,
    });

    return NextResponse.json({
      ok: failureCount === 0,
      summary: {
        workspacesProcessed: workspaceIds.length,
        successCount,
        failureCount,
        totalInsightsDetected,
        totalExpired,
        totalDurationMs,
      },
      results,
    });
  } catch (error: unknown) {
    const totalDurationMs = Date.now() - startTime;
    logger.error("[CronInsights] Cron job failed", {
      error,
      totalDurationMs,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        totalDurationMs,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/insights
 *
 * Health check endpoint for the cron job.
 * Returns information about the cron configuration.
 */
export async function GET(request: NextRequest) {
  // Auth check
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  // Get active workspace count (workspaces with at least one member)
  const workspaceCount = await prisma.workspace.count({
    where: {
      members: {
        some: {},
      },
    },
  });

  // Get recent insight stats
  const recentInsights = await prisma.proactiveInsight.groupBy({
    by: ["status"],
    _count: { id: true },
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });

  const stats = {
    activeWorkspaces: workspaceCount,
    last24Hours: Object.fromEntries(
      recentInsights.map((r) => [r.status, r._count.id])
    ),
  };

  return NextResponse.json({
    ok: true,
    name: "Proactive Insights Detection",
    description:
      "Detects and stores proactive insights for organizational health",
    recommendedSchedule: "Every 15 minutes",
    maxDuration: `${maxDuration} seconds`,
    stats,
  });
}
