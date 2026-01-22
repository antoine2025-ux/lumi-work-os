import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireEdit } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const body = (await req.json()) as { id: string };

  const updated = await prisma.orgDuplicateCandidate.update({
    where: { id: body.id },
    data: { status: "DISMISSED" },
  });

  return NextResponse.json({ ok: true, candidate: updated });
}

