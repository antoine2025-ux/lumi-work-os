import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgContext } from "@/server/rbac";

function csvEscape(v: any) {
  const s = (v ?? "").toString();
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error) {
      console.error("[GET /api/org/people/export] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;

    // Get all positions with users
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            name: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const header = ["id", "name", "email", "title", "team", "manager"];
    const lines = [header.join(",")];

    for (const pos of positions) {
      if (!pos.user) continue;
      const row = [
        pos.user.id,
        pos.user.name || "",
        pos.user.email || "",
        pos.title || "",
        pos.team?.name || "",
        pos.parent?.user?.name || "",
      ];
      lines.push(row.map(csvEscape).join(","));
    }

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="people-${workspaceId}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting people:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error.message || "Failed to export" } },
      { status: 500 }
    );
  }
}

