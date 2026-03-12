import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";
import { logOrgAuditBatch } from "@/lib/audit/org-audit";
import { ReorderTeamsSchema } from "@/lib/validations/org";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/teams/reorder";

  try {
    if (isOrgCenterForceDisabled()) {
      await recordOrgApiHit(routeId, 503, null, null);
      return NextResponse.json(
        { error: "Org Center is temporarily unavailable." },
        { status: 503 }
      );
    }

    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      await recordOrgApiHit(routeId, 401, null, null);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const body = ReorderTeamsSchema.parse(await req.json());
    const updates = body.updates;

    // Fetch team names for audit logging
    const teamIds = updates.map((u: { id: string; position: number }) => u.id);
    const teams = await prisma.orgTeam.findMany({
      where: { id: { in: teamIds }, workspaceId: auth.workspaceId },
      select: { id: true, name: true, order: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    // Update teams in a transaction
    await Promise.all(
      updates.map((u: { id: string; position: number }) =>
        prisma.orgTeam.update({
          where: { id: u.id, workspaceId: auth.workspaceId },
          data: { order: u.position },
        })
      )
    );

    // Log audit entries (fire-and-forget batch)
    const auditEntries = updates
      .map((u: { id: string; position: number }) => {
        const team = teamMap.get(u.id);
        if (!team || team.order === u.position) return null;
        return {
          workspaceId: auth.workspaceId,
          entityType: "TEAM" as const,
          entityId: u.id,
          entityName: team.name,
          action: "UPDATED" as const,
          actorId: auth.user.userId,
          changes: { order: { from: team.order, to: u.position } },
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (auditEntries.length > 0) {
      logOrgAuditBatch(auditEntries).catch((e: any) =>
        console.error("[POST /api/org/teams/reorder] Audit error:", e)
      );
    }

    await recordOrgApiHit(routeId, 200, auth.workspaceId, auth.user.userId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    await recordOrgApiHit(routeId, 500, null, null);
    return handleApiError(error, req);
  }
}

