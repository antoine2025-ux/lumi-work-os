import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  // Allow non-admin reads for eligibility checks

  const cfg = await prisma.orgLoopBrainRollout.findUnique({
    where: { orgId_scope: { orgId: ctx.orgId, scope: "people_issues" } },
  });

  return NextResponse.json({ ok: true, config: cfg });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const body = (await req.json()) as {
    mode: string;
    teamName?: string;
    enabled: boolean;
  };

  const cfg = await prisma.orgLoopBrainRollout.upsert({
    where: { orgId_scope: { orgId: ctx.orgId, scope: "people_issues" } },
    update: {
      mode: body.mode,
      teamName: body.teamName || null,
      enabled: body.enabled,
    },
    create: {
      orgId: ctx.orgId,
      scope: "people_issues",
      mode: body.mode,
      teamName: body.teamName || null,
      enabled: body.enabled,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      orgId: ctx.orgId,
      actorUserId: ctx.user?.id ?? null,
      actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
      action: "update_loopbrain_rollout",
      targetCount: 1,
      summary: `LoopBrain rollout set to ${body.mode}${body.teamName ? ` (team: ${body.teamName})` : ""} (enabled=${!!body.enabled})`,
    },
  });

  return NextResponse.json({ ok: true, config: cfg });
}

