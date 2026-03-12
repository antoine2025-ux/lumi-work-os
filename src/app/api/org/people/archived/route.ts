import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

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

    const workspaceId = auth.workspaceId;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    // Fetch archived positions (personId refers to OrgPosition.id)
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        archivedAt: { not: null },
        ...(q
          ? {
              OR: [
                { user: { name: { contains: q, mode: "insensitive" } } },
                { user: { email: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { archivedAt: "desc" },
      take: 200,
    });

    const people = positions.map((pos) => ({
      id: pos.id,
      name: pos.user?.name || null,
      email: pos.user?.email || null,
      archivedAt: pos.archivedAt?.toISOString() || "",
      archivedReason: pos.archivedReason || null,
      mergedIntoId: pos.mergedIntoId || null,
    }));

    return NextResponse.json({ ok: true, people });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

