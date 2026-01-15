import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgContext } from "@/server/rbac";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "people";

    const workspaceId = auth.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "No workspace" }, { status: 403 });
    }

    // Note: orgSavedView model requires prisma generate to be recognized in types
    const views = await (prisma as any).orgSavedView.findMany({
      where: { workspaceId, scope },
      orderBy: { name: "asc" },
      select: { id: true, name: true, key: true, filters: true },
    }) as { id: string; name: string; key: string; filters: any }[];

    return NextResponse.json({ ok: true, views });
  } catch (error: any) {
    console.error("Error fetching saved views:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error.message || "Failed to fetch views" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error) {
      console.error("[POST /api/org/views] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }
    if (!ctx.canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "No workspace" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { scope = "people", name, key, filters } = body ?? {};
    if (!name || typeof name !== "string") return badRequest("name is required");
    if (!key || typeof key !== "string") return badRequest("key is required");
    if (!filters || typeof filters !== "object") return badRequest("filters must be an object");

    const created = await (prisma as any).orgSavedView.upsert({
      where: { workspaceId_scope_key: { workspaceId, scope, key } },
      update: { name: name.trim(), filters },
      create: { workspaceId, scope, name: name.trim(), key: key.trim(), filters },
      select: { id: true, name: true, key: true, filters: true },
    }) as { id: string; name: string; key: string; filters: any };

    return NextResponse.json({ ok: true, view: created });
  } catch (error: any) {
    console.error("Error creating saved view:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create view" } },
      { status: 500 }
    );
  }
}
