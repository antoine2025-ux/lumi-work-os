import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertWorkspaceAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    // Assert user has workspace access (MEMBER+ can view org health)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER']);
    setWorkspaceContext(auth.workspaceId);

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error: unknown) {
      console.error("[GET /api/org/people/health] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.workspaceId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;

    // Get all positions for this workspace
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        parentId: true,
        title: true,
        teamId: true,
      },
    });

    const total = positions.length;
    
    // Count roles (positions with title)
    const hasRole = positions.filter((p) => !!p.title).length;
    
    // Count teams
    const hasTeam = positions.filter((p) => !!p.teamId).length;

    // Reporting line coverage: allow 1 person org to be "complete" for reporting
    const positionIds = new Set(positions.map((p) => p.id));
    const reportingCovered =
      total <= 1
        ? total
        : positions.filter((p) => !!p.parentId && positionIds.has(p.parentId)).length;

    const rolesPct = total === 0 ? 0 : Math.round((hasRole / total) * 100);
    const teamsPct = total === 0 ? 0 : Math.round((hasTeam / total) * 100);
    const reportingPct = total === 0 ? 0 : Math.round((reportingCovered / total) * 100);

    // Overall completeness: simple weighted average (reporting slightly higher weight)
    const overall = total === 0 ? 0 : Math.round(reportingPct * 0.4 + rolesPct * 0.3 + teamsPct * 0.3);

    return NextResponse.json({
      ok: true,
      total,
      overallPct: overall,
      breakdown: {
        reporting: { covered: reportingCovered, total, pct: reportingPct },
        roles: { covered: hasRole, total, pct: rolesPct },
        teams: { covered: hasTeam, total, pct: teamsPct },
      },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

