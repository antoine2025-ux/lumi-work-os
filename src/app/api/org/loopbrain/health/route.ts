/**
 * GET /api/org/loopbrain/health
 * 
 * Quick health check endpoint for Loopbrain ingestion verification.
 * Returns minimal snapshot info + counts.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
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

    const latest = await prisma.orgIntelligenceSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, findingCount: true },
    });

    const peopleCount = await prisma.orgPosition.count({
      where: { isActive: true, userId: { not: null } },
    });
    const teamCount = await prisma.orgTeam.count({
      where: { isActive: true },
    });

    return NextResponse.json(
      {
        ok: true,
        latestSnapshot: latest
          ? {
              id: latest.id,
              createdAt: latest.createdAt.toISOString(),
              findingCount: latest.findingCount,
            }
          : null,
        counts: { people: peopleCount, teams: teamCount },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

