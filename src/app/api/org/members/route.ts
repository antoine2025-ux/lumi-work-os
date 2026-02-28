import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { OrgMemberCreateSchema } from "@/lib/validations/org";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const members = await prisma.orgMembership.findMany({
      where: { workspaceId: auth.workspaceId },
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
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const body = OrgMemberCreateSchema.parse(await req.json());

    const created = await prisma.orgMembership.upsert({
      where: { workspaceId_userId: { workspaceId: auth.workspaceId, userId: body.userId } },
      // Prisma expects OrgRole enum; body.role is a validated string from Zod.
      // The mismatch is pre-existing (was `as any` before Zod) — safe to cast.
      update: { role: body.role as unknown as import("@prisma/client").OrgRole },
      create: { workspaceId: auth.workspaceId, userId: body.userId, role: body.role as unknown as import("@prisma/client").OrgRole },
    });

    return NextResponse.json({ ok: true, member: created });
  } catch (error) {
    return handleApiError(error);
  }
}
