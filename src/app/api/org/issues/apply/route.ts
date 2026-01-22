import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { revalidateTag } from "next/cache";
import { measureOrgOutcomes } from "@/server/loopbrain/outcomes";
import { measureOrgHealth } from "@/server/orgHealth";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  const body = (await req.json()) as {
    actions: Array<{ personId: string; patch: any }>;
    suggestionRunId?: string;
  };

  const actions = Array.isArray(body.actions) ? body.actions : [];
  if (!actions.length) return NextResponse.json({ ok: false, error: "actions required" }, { status: 400 });

  // Capture baseline health snapshot before applying changes
  const beforeSnapshot = await (prisma as any).orgHealthSnapshot.findFirst({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction(async (tx) => {
    for (const a of actions) {
      const patch: any = {};
      if (a.patch.managerId !== undefined) {
        // Find the manager position to get parentId
        if (a.patch.managerId) {
          const managerPos = await (tx as any).orgPosition.findFirst({
            where: {
              workspaceId,
              userId: a.patch.managerId,
              isActive: true,
              archivedAt: null,
            },
          });
          if (managerPos) {
            patch.parentId = managerPos.id;
          }
        } else {
          patch.parentId = null;
        }
      }
      if (a.patch.teamName !== undefined) {
        if (a.patch.teamName) {
          const team = await tx.orgTeam.findFirst({
            where: {
              workspaceId,
              name: a.patch.teamName,
            },
          });
          if (team) {
            patch.teamId = team.id;
          }
        } else {
          patch.teamId = null;
        }
      }
      if (a.patch.title !== undefined) {
        patch.title = a.patch.title;
      }

      if (Object.keys(patch).length > 0) {
        await tx.orgPosition.update({
          where: { id: a.personId },
          data: patch,
        });
      }
    }

    await (tx as any).auditLogEntry.create({
      data: {
        orgId: ctx.orgId,
        actorUserId: ctx.user?.id ?? null,
        actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
        action: "apply_issue_suggestions",
        targetCount: actions.length,
        summary: `Applied LoopBrain suggestions to ${actions.length} people`,
      },
    });
  });

  // Record feedback implicitly as "accepted" if suggestionRunId provided
  if (body.suggestionRunId) {
    await (prisma as any).loopBrainFeedback.create({
      data: {
        orgId: ctx.orgId,
        scope: "people_issues",
        suggestionRunId: body.suggestionRunId,
        accepted: true,
      },
    });

    // Measure outcomes: create new health snapshot and compare
    const afterSnapshot = await measureOrgHealth(ctx.orgId);

    await (prisma as any).loopBrainOutcome.create({
      data: {
        orgId: ctx.orgId,
        scope: "people_issues",
        suggestionRunId: body.suggestionRunId,
        beforeMetrics: beforeSnapshot?.metrics || {},
        afterMetrics: afterSnapshot.snapshot.metrics as any,
        improved: (afterSnapshot.snapshot.score || 0) > ((beforeSnapshot?.score as number) || 0),
      },
    }).catch(() => null);
  } else {
    // Even without suggestionRunId, create a health snapshot after apply
    await measureOrgHealth(ctx.orgId).catch(() => null);
  }

  revalidateTag(`org:${ctx.orgId}:people`);
  revalidateTag(`org:${ctx.orgId}:audit`);

  return NextResponse.json({ ok: true, applied: actions.length });
}

