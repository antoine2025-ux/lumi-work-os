import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { listEngines } from "@/server/loopbrain/registry";
import { getOrgContext, requireAdmin } from "@/server/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const engines = listEngines().filter((e) => e.scope === "people_issues");

  const cfg = await (prisma as any).orgLoopBrainConfig.findUnique({
    where: { orgId_scope: { orgId: ctx.orgId, scope: "people_issues" } },
  });

  return NextResponse.json({ ok: true, engines, config: cfg || null });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const body = (await req.json()) as { engineId: string; enabled: boolean };

  const updated = await (prisma as any).orgLoopBrainConfig.upsert({
    where: { orgId_scope: { orgId: ctx.orgId, scope: "people_issues" } },
    update: { engineId: body.engineId, enabled: !!body.enabled },
    create: { orgId: ctx.orgId, scope: "people_issues", engineId: body.engineId, enabled: !!body.enabled },
  });

  await (prisma as any).auditLogEntry.create({
    data: {
      orgId: ctx.orgId,
      actorUserId: ctx.user?.id ?? null,
      actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
      action: "update_loopbrain_engine",
      targetCount: 1,
      summary: `LoopBrain engine set to ${body.engineId} (enabled=${!!body.enabled})`,
    },
  });

  return NextResponse.json({ ok: true, config: updated });
}

