import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getOrgContext } from "@/server/rbac";
import { handleApiError } from "@/lib/api-errors";
import { CreateOrgViewSchema } from '@/lib/validations/org';

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
    if (!auth.isAuthenticated || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const views = await prisma.orgSavedView.findMany({
      where: { workspaceId, scope },
      orderBy: { name: "asc" },
      select: { id: true, name: true, key: true, filters: true },
    });

    return NextResponse.json({ ok: true, views });
  } catch (error) {
    return handleApiError(error, req)
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

    if (!ctx.workspaceId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }
    if (!ctx.canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;
    if (!auth.isAuthenticated || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
    setWorkspaceContext(workspaceId);

    const body = CreateOrgViewSchema.parse(await req.json());
    const { scope, name, key, filters, shared } = body;

    const created = await prisma.orgSavedView.upsert({
      where: { workspaceId_scope_key: { workspaceId, scope, key: key || name.toLowerCase().replace(/\s+/g, '-') } },
      update: { name: name.trim(), filters: filters as any },
      create: { workspaceId, scope, name: name.trim(), key: (key || name.toLowerCase().replace(/\s+/g, '-')).trim(), filters: filters as any },
      select: { id: true, name: true, key: true, filters: true },
    });

    return NextResponse.json({ ok: true, view: created });
  } catch (error) {
    return handleApiError(error, req)
  }
}
