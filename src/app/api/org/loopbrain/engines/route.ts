import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { listEngines } from "@/server/loopbrain/registry";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const engines = listEngines().filter((e) => e.scope === "people_issues");

    const cfg = await prisma.orgLoopBrainConfig.findUnique({
      where: { workspaceId_scope: { workspaceId, scope: "people_issues" } },
    });

    return NextResponse.json({ ok: true, engines, config: cfg || null });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const body = (await req.json()) as { engineId: string; enabled: boolean };

    const updated = await prisma.orgLoopBrainConfig.upsert({
      where: { workspaceId_scope: { workspaceId, scope: "people_issues" } },
      update: { engineId: body.engineId, enabled: !!body.enabled },
      create: { workspaceId, scope: "people_issues", engineId: body.engineId, enabled: !!body.enabled },
    });

    await prisma.auditLogEntry.create({
      data: {
        workspaceId,
        actorUserId: user.userId,
        actorLabel: user.name || user.email || "Unknown user",
        action: "update_loopbrain_engine",
        targetCount: 1,
        summary: `LoopBrain engine set to ${body.engineId} (enabled=${!!body.enabled})`,
      },
    });

    return NextResponse.json({ ok: true, config: updated });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
