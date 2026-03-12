import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { measureOrgHealth } from "@/server/orgHealth";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';
import { handleApiError } from '@/lib/api-errors';
import type { Prisma } from '@prisma/client'
import { ApplyIssuesSchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const body = ApplyIssuesSchema.parse(await req.json());
    const actions = body.actions;

    // Capture baseline health snapshot before applying changes
    const beforeSnapshot = await prisma.orgHealthSnapshot.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    await prisma.$transaction(async (tx) => {
      for (const a of actions) {
        const patch: Record<string, string | null> = {};
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
          workspaceId,
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
        data: { workspaceId, scope: "people_issues", suggestionRunId: body.suggestionRunId, accepted: true },
      });

      const afterResult = await measureOrgHealth(workspaceId);
      await prisma.loopBrainOutcome.create({
        data: {
          workspaceId,
          scope: "people_issues",
          suggestionRunId: body.suggestionRunId,
          beforeMetrics: (beforeSnapshot?.capacityScore != null ? { capacityScore: beforeSnapshot.capacityScore } : {}) as Prisma.InputJsonValue,
          afterMetrics: (afterResult.metrics as unknown) as Prisma.InputJsonValue,
          improved: (afterResult.score || 0) > ((beforeSnapshot?.capacityScore ?? 0) / 100),
        },
      }).catch(() => null);
    } else {
      await measureOrgHealth(workspaceId).catch(() => null);
    }

    revalidateTag(`org:${workspaceId}:people`, "default");
    revalidateTag(`org:${workspaceId}:audit`, "default");

    return NextResponse.json({ ok: true, applied: actions.length });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
