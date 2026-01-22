import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireAdmin } from "@/server/rbac";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const cfg = await prisma.orgHealthDigest.findUnique({
    where: { orgId: ctx.orgId },
  });

  return NextResponse.json({ ok: true, config: cfg });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const body = (await req.json()) as {
    enabled: boolean;
    recipients: any[];
  };

  const cfg = await prisma.orgHealthDigest.upsert({
    where: { orgId: ctx.orgId },
    update: { enabled: body.enabled, recipients: body.recipients },
    create: {
      orgId: ctx.orgId,
      cadence: "WEEKLY",
      enabled: body.enabled,
      recipients: body.recipients,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      orgId: ctx.orgId,
      actorUserId: ctx.user?.id ?? null,
      actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
      action: "update_org_digest_config",
      targetCount: 1,
      summary: `Org health digest ${body.enabled ? "enabled" : "disabled"} for ${body.recipients.length} recipients`,
    },
  });

  return NextResponse.json({ ok: true, config: cfg });
}

