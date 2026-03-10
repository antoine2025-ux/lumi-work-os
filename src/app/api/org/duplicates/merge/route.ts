import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { MergeDuplicateSchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const body = MergeDuplicateSchema.parse(await req.json());

    if (body.canonicalId === body.mergedId) {
      return NextResponse.json({ ok: false, error: "canonicalId and mergedId must differ" }, { status: 400 });
    }

    const candidate = await prisma.orgDuplicateCandidate.findUnique({ where: { id: body.candidateId } });
    if (!candidate || candidate.workspaceId !== workspaceId) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // Load positions (personId refers to OrgPosition.id)
    const canonicalPos = await prisma.orgPosition.findUnique({
      where: { id: body.canonicalId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const mergedPos = await prisma.orgPosition.findUnique({
      where: { id: body.mergedId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!canonicalPos || !mergedPos) return NextResponse.json({ ok: false, error: "Missing records" }, { status: 404 });
    if (canonicalPos.workspaceId !== workspaceId || mergedPos.workspaceId !== workspaceId) return NextResponse.json({ ok: false, error: "Wrong workspace" }, { status: 403 });

    // Capture direct reports that will be rewired (BEFORE transaction)
    const directReports = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        parentId: body.mergedId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true },
    });
    const reportIds = directReports.map((r) => r.id);

    // Build person-like snapshot for undo
    const mergedSnapshot = {
      id: mergedPos.id,
      workspaceId: mergedPos.workspaceId,
      userId: mergedPos.userId,
      title: mergedPos.title,
      level: mergedPos.level,
      parentId: mergedPos.parentId,
      teamId: mergedPos.teamId,
      isActive: mergedPos.isActive,
      name: mergedPos.user?.name || null,
      email: mergedPos.user?.email || null,
      teamName: mergedPos.team?.name || null,
      managerId: mergedPos.parent?.user?.id || null,
      managerName: mergedPos.parent?.user?.name || null,
    };

    // Snapshot merged for undo (including report rewires)
    await prisma.orgPersonMergeLog.create({
      data: {
        workspaceId,
        canonicalId: body.canonicalId,
        mergedId: body.mergedId,
        snapshot: mergedSnapshot,
        reportRewireSnapshot: { rewiredReportIds: reportIds },
        actorUserId: user.userId,
        actorLabel: user.name || user.email || "Unknown user",
      },
    });

    // Merge strategy: prefer canonical non-null values; fill gaps from merged
    const patch: Record<string, any> = {};

    // Title
    if (!canonicalPos.title || canonicalPos.title.trim() === "") {
      if (mergedPos.title && mergedPos.title.trim() !== "") patch.title = mergedPos.title;
    }

    // Team
    if (!canonicalPos.teamId) {
      if (mergedPos.teamId) patch.teamId = mergedPos.teamId;
    }

    // Manager (parentId)
    if (!canonicalPos.parentId) {
      if (mergedPos.parentId) patch.parentId = mergedPos.parentId;
    }

    // Transaction: update canonical, rewire reports, archive merged, mark candidate merged, audit
    await prisma.$transaction(async (tx) => {
      if (Object.keys(patch).length) {
        await tx.orgPosition.update({ where: { id: body.canonicalId }, data: patch });
      }

      // Rewire direct reports from merged -> canonical
      await tx.orgPosition.updateMany({
        where: { workspaceId, parentId: body.mergedId, isActive: true, archivedAt: null },
        data: { parentId: body.canonicalId },
      });

      // Archive merged (no longer appears in people list)
      await tx.orgPosition.update({
        where: { id: body.mergedId },
        data: {
          archivedAt: new Date(),
          archivedReason: "MERGED_DUPLICATE",
          mergedIntoId: body.canonicalId,
          isActive: false, // Also mark inactive for safety
        },
      });

      await tx.orgDuplicateCandidate.update({ where: { id: body.candidateId }, data: { status: "MERGED" } });

      await tx.auditLogEntry.create({
        data: {
          workspaceId,
          actorUserId: user.userId,
          actorLabel: user.name || user.email || "Unknown user",
          action: "merge_person",
          targetCount: 2,
          summary: `Merged duplicate ${body.mergedId} into ${body.canonicalId} (rewired reports + archived)`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, req);
  }
}
