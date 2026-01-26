import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const body = (await req.json()) as { id: string };

  // Restore archived position
  const updated = await prisma.orgPosition.update({
    where: { id: body.id },
    data: {
      archivedAt: null,
      archivedReason: null,
      mergedIntoId: null,
      isActive: true, // Also reactivate
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      orgId: ctx.orgId,
      actorUserId: ctx.user?.id ?? null,
      actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
      action: "restore_person",
      targetCount: 1,
      summary: `Restored archived person ${body.id}`,
    },
  });

  return NextResponse.json({ ok: true, person: updated });
}

