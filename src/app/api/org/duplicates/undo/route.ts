import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  const body = (await req.json()) as { mergeLogId: string };

  const log = await prisma.orgPersonMergeLog.findUnique({ where: { id: body.mergeLogId } });
  if (!log || log.orgId !== ctx.orgId) return NextResponse.json({ ok: false }, { status: 404 });
  if (log.undoneAt) return NextResponse.json({ ok: false, error: "Already undone" }, { status: 400 });

  const snapshot = log.snapshot as any;
  const rewireSnapshot = (log.reportRewireSnapshot as any) || {};
  const ids: string[] = Array.isArray(rewireSnapshot.rewiredReportIds) ? rewireSnapshot.rewiredReportIds : [];

  // Transaction: restore merged record, unarchive, set mergedIntoId null, and reverse report rewires
  await prisma.$transaction(async (tx) => {
    // Restore merged position core fields from snapshot
    await tx.orgPosition.update({
      where: { id: log.mergedId },
      data: {
        title: snapshot.title || null,
        level: snapshot.level || 1,
        parentId: snapshot.parentId || null,
        teamId: snapshot.teamId || null,
        isActive: snapshot.isActive !== undefined ? snapshot.isActive : true,
        archivedAt: null,
        archivedReason: null,
        mergedIntoId: null,
      },
    });

    // Reverse report rewires: only rewire reports that still point to canonicalId (safe)
    if (ids.length) {
      await tx.orgPosition.updateMany({
        where: {
          workspaceId,
          id: { in: ids },
          parentId: log.canonicalId, // only if still pointing to canonical
          isActive: true,
          archivedAt: null,
        },
        data: { parentId: log.mergedId },
      });
    }

    await tx.orgPersonMergeLog.update({
      where: { id: log.id },
      data: { undoneAt: new Date() },
    });

    await tx.auditLogEntry.create({
      data: {
        orgId: ctx.orgId,
        actorUserId: ctx.user?.id ?? null,
        actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
        action: "undo_merge_person",
        targetCount: 1,
        summary: `Restored merged person ${log.mergedId}${ids.length > 0 ? ` (rewired ${ids.length} reports back)` : ""}`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
