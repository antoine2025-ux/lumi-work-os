import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId, isActive: true, archivedAt: null },
      select: {
        id: true,
        parentId: true,
        title: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const missingManager = new Set(positions.filter((p) => !p.parentId).map((p) => p.id));

    for (const id of missingManager) {
      await prisma.orgPersonIssue.upsert({
        where: { workspaceId_personId_type: { workspaceId, personId: id, type: "MISSING_MANAGER" } },
        update: { lastSeenAt: now, resolvedAt: null },
        create: { workspaceId, personId: id, type: "MISSING_MANAGER", firstSeenAt: now, lastSeenAt: now },
      });
    }

    await prisma.orgPersonIssue.updateMany({
      where: { workspaceId, type: "MISSING_MANAGER", resolvedAt: null, personId: { notIn: Array.from(missingManager) } },
      data: { resolvedAt: now, lastSeenAt: now },
    });

    const missingTeam = positions.filter((p) => !p.teamId && !p.team?.id).map((p) => p.id);
    for (const id of missingTeam) {
      await prisma.orgPersonIssue.upsert({
        where: { workspaceId_personId_type: { workspaceId, personId: id, type: "MISSING_TEAM" } },
        update: { lastSeenAt: now, resolvedAt: null },
        create: { workspaceId, personId: id, type: "MISSING_TEAM", firstSeenAt: now, lastSeenAt: now },
      });
    }

    const missingRole = positions.filter((p) => !p.title || p.title.trim() === "").map((p) => p.id);
    for (const id of missingRole) {
      await prisma.orgPersonIssue.upsert({
        where: { workspaceId_personId_type: { workspaceId, personId: id, type: "MISSING_ROLE" } },
        update: { lastSeenAt: now, resolvedAt: null },
        create: { workspaceId, personId: id, type: "MISSING_ROLE", firstSeenAt: now, lastSeenAt: now },
      });
    }

    await prisma.orgPersonIssue.updateMany({
      where: {
        workspaceId,
        resolvedAt: null,
        OR: [
          { type: "MISSING_TEAM", personId: { notIn: missingTeam } },
          { type: "MISSING_ROLE", personId: { notIn: missingRole } },
        ],
      },
      data: { resolvedAt: now, lastSeenAt: now },
    });

    return NextResponse.json({
      ok: true,
      missingCount: missingManager.size,
      missingTeamCount: missingTeam.length,
      missingRoleCount: missingRole.length,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
