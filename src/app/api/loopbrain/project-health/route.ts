/**
 * Loopbrain Project Health API
 *
 * GET: Retrieve project health snapshot for a project
 * POST: Trigger health snapshot generation for multiple projects
 *
 * @see src/lib/loopbrain/reasoning/projectHealth.ts
 * @see src/lib/loopbrain/contract/projectHealth.v0.ts
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
  buildProjectHealthSnapshot,
  buildMultipleProjectHealthSnapshots,
} from "@/lib/loopbrain/reasoning/projectHealth";
import { LoopbrainProjectHealthSchema } from "@/lib/validations/loopbrain";

/**
 * GET /api/loopbrain/project-health
 *
 * Query parameters:
 * - projectId: Project ID to get health for (required)
 * - includeHistory: Include historical velocity analysis (default: true)
 * - velocityWeeks: Number of weeks for velocity calculation (default: 4)
 *
 * Response: ProjectHealthSnapshotV0
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request GET /api/loopbrain/project-health", baseContext);

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
    const projectId = searchParams.get("projectId");
    const includeHistory = searchParams.get("includeHistory") !== "false";
    const velocityWeeks = parseInt(
      searchParams.get("velocityWeeks") || "4",
      10
    );

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify project belongs to workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: auth.workspaceId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Build health snapshot
    const snapshot = await buildProjectHealthSnapshot(
      auth.workspaceId,
      projectId,
      { includeHistory, velocityWeeks }
    );

    const durationMs = Date.now() - startTime;
    logger.info("GET /api/loopbrain/project-health completed", {
      ...baseContext,
      projectId,
      overallHealth: snapshot.summary.overallHealth,
      durationMs,
    });

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * POST /api/loopbrain/project-health
 *
 * Trigger health snapshot generation for multiple projects.
 *
 * Request body:
 * {
 *   "projectIds": string[] (optional - if not provided, generates for all active projects)
 *   "includeHistory": boolean (default: true)
 *   "velocityWeeks": number (default: 4)
 * }
 *
 * Response: Array of ProjectHealthSnapshotV0
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request POST /api/loopbrain/project-health", baseContext);

  try {
    const auth = await getUnifiedAuth(request);

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId);

    // Parse request body
    const body = LoopbrainProjectHealthSchema.parse(
      await request.json().catch(() => ({}))
    );

    const { includeHistory = true, velocityWeeks = 4 } = body;
    let projectIds = body.projectIds;

    // If no project IDs provided, get all active projects
    if (!projectIds || projectIds.length === 0) {
      const projects = await prisma.project.findMany({
        where: {
          workspaceId: auth.workspaceId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: { id: true },
        take: 50, // Limit to prevent runaway processing
      });
      projectIds = projects.map((p) => p.id);
    }

    if (projectIds.length === 0) {
      return NextResponse.json({
        snapshots: [],
        message: "No active projects found",
      });
    }

    // Build health snapshots
    const snapshots = await buildMultipleProjectHealthSnapshots(
      auth.workspaceId,
      projectIds,
      { includeHistory, velocityWeeks }
    );

    // Calculate summary
    const summary = {
      totalProjects: snapshots.length,
      byHealth: {
        excellent: snapshots.filter((s) => s.summary.overallHealth === "EXCELLENT")
          .length,
        good: snapshots.filter((s) => s.summary.overallHealth === "GOOD").length,
        atRisk: snapshots.filter((s) => s.summary.overallHealth === "AT_RISK")
          .length,
        critical: snapshots.filter((s) => s.summary.overallHealth === "CRITICAL")
          .length,
      },
      avgHealthScore:
        snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + s.summary.healthScore, 0) /
            snapshots.length
          : 0,
    };

    const durationMs = Date.now() - startTime;
    logger.info("POST /api/loopbrain/project-health completed", {
      ...baseContext,
      projectCount: snapshots.length,
      avgHealthScore: Math.round(summary.avgHealthScore * 100),
      durationMs,
    });

    return NextResponse.json({
      snapshots,
      summary,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
