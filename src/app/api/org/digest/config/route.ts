import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const cfg = await prisma.orgHealthDigest.findUnique({
      where: { orgId: workspaceId },
    });

    return NextResponse.json({ ok: true, config: cfg });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const body = (await req.json()) as {
      enabled: boolean;
      recipients: any[];
    };

    const cfg = await prisma.orgHealthDigest.upsert({
      where: { orgId: workspaceId },
      update: { enabled: body.enabled, recipients: body.recipients },
      create: {
        orgId: workspaceId,
        cadence: "WEEKLY",
        enabled: body.enabled,
        recipients: body.recipients,
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        orgId: workspaceId,
        actorUserId: user.userId,
        actorLabel: user.name || user.email || "Unknown user",
        action: "update_org_digest_config",
        targetCount: 1,
        summary: `Org health digest ${body.enabled ? "enabled" : "disabled"} for ${body.recipients.length} recipients`,
      },
    });

    return NextResponse.json({ ok: true, config: cfg });
  } catch (error) {
    return handleApiError(error, req);
  }
}
