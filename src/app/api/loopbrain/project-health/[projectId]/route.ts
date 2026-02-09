/**
 * Loopbrain Project Health API (by project)
 *
 * GET: Retrieve project health snapshot for a project.
 * Returns ProjectHealthSnapshotV0.
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
import { buildProjectHealthSnapshot } from "@/lib/loopbrain/reasoning/projectHealth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    const { projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get("includeHistory") !== "false";
    const velocityWeeks = parseInt(
      searchParams.get("velocityWeeks") || "4",
      10
    );

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

    const snapshot = await buildProjectHealthSnapshot(
      auth.workspaceId,
      projectId,
      { includeHistory, velocityWeeks }
    );

    logger.info("GET /api/loopbrain/project-health/[projectId] completed", {
      ...baseContext,
      projectId,
      overallHealth: snapshot.summary.overallHealth,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
