import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { handleApiError } from "@/lib/api-errors";
import { OrgMemberCreateSchema } from "@/lib/validations/org";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOrgContext(req);
    if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

    const members = await prisma.orgMembership.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        role: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        // Join to User table if present
      },
    });

    return NextResponse.json({ ok: true, members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = OrgMemberCreateSchema.parse(await req.json());
    const ctx = await getOrgContext(req);
    if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

    requireEdit(ctx.role === "ADMIN");

    const created = await prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: ctx.orgId, userId: body.userId } },
      // Prisma expects OrgRole enum; body.role is a validated string from Zod.
      // The mismatch is pre-existing (was `as any` before Zod) — safe to cast.
      update: { role: body.role as unknown as import("@prisma/client").OrgRole },
      create: { orgId: ctx.orgId, userId: body.userId, role: body.role as unknown as import("@prisma/client").OrgRole },
    });

    return NextResponse.json({ ok: true, member: created });
  } catch (error) {
    return handleApiError(error);
  }
}
