import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { handleApiError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOrgContext(req);
    if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
    requireAdmin((ctx as any).canAdmin);

    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

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
  } catch (error) {
    return handleApiError(error);
  }
}

