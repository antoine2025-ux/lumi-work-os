// @ts-nocheck
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { measureOrgHealth } from "@/server/orgHealth";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const orgId = auth.workspaceId;
    const workspaceId = auth.workspaceId;

    const body = (await req.json()) as {
      actions: Array<{ personId: string; patch: any }>;
      suggestionRunId?: string;
    };

    const actions = Array.isArray(body.actions) ? body.actions : [];
    if (!actions.length) return NextResponse.json({ ok: false, error: "actions required" }, { status: 400 });

    // Capture baseline health snapshot before applying changes
    const beforeSnapshot = await prisma.orgHealthSnapshot.findFirst({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    await prisma.$transaction(async (tx) => {
      for (const a of actions) {
        const patch: any = {};
        if (a.patch.managerId !== undefined) {
          if (a.patch.managerId) {
            const managerPos = await tx.orgPosition.findFirst({
              where: { workspaceId, userId: a.patch.managerId, isActive: true, archivedAt: null },
            });
            if (managerPos) patch.parentId = managerPos.id;
          } else {
            patch.parentId = null;
          }
        }
        if (a.patch.teamName !== undefined) {
          if (a.patch.teamName) {
            const team = await tx.orgTeam.findFirst({ where: { workspaceId, name: a.patch.teamName } });
            if (team) patch.teamId = team.id;
          } else {
            patch.teamId = null;
          }
        }
        if (a.patch.title !== undefined) patch.title = a.patch.title;

        if (Object.keys(patch).length > 0) {
          await tx.orgPosition.update({ where: { id: a.personId }, data: patch });
        }
      }

      await tx.auditLogEntry.create({
        data: {
          orgId,
          actorUserId: auth.user.userId,
          actorLabel: auth.user.userId,
          action: "apply_issue_suggestions",
          targetCount: actions.length,
          summary: `Applied LoopBrain suggestions to ${actions.length} people`,
        },
      });
    });

    if (body.suggestionRunId) {
      await prisma.loopBrainFeedback.create({
        data: { orgId, scope: "people_issues", suggestionRunId: body.suggestionRunId, accepted: true },
      });

      const afterSnapshot = await measureOrgHealth(orgId);
      await prisma.loopBrainOutcome.create({
        data: {
          orgId,
          scope: "people_issues",
          suggestionRunId: body.suggestionRunId,
          beforeMetrics: beforeSnapshot?.metrics || {},
          afterMetrics: afterSnapshot.snapshot.metrics as any,
          improved: (afterSnapshot.snapshot.score || 0) > ((beforeSnapshot?.score as number) || 0),
        },
      }).catch(() => null);
    } else {
      await measureOrgHealth(orgId).catch(() => null);
    }

    revalidateTag(`org:${orgId}:people`);
    revalidateTag(`org:${orgId}:audit`);

    return NextResponse.json({ ok: true, applied: actions.length });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
