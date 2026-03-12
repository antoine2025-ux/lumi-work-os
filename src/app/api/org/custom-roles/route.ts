import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
} from "@/lib/org/permissions.server";
import { OrgCustomRoleCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';
import { logOrgAudit } from '@/lib/audit/org-audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const workspaceId = auth.workspaceId;

    // ADAPT: After running migrations, this will work
    // The model name matches your Prisma schema (OrgCustomRole → orgCustomRole)
    const roles = await prisma.orgCustomRole.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ roles }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const { key, name, description, capabilities } = OrgCustomRoleCreateSchema.parse(
      await req.json()
    );

    const workspaceId = auth.workspaceId;

    const created = await prisma.orgCustomRole.create({
      data: {
        workspaceId,
        key,
        name,
        description: description || null,
        capabilities: capabilities ?? [],
      },
    });

    // Log audit entry (fire-and-forget)
    logOrgAudit({
      workspaceId,
      entityType: "CUSTOM_ROLE",
      entityId: created.id,
      entityName: created.name,
      action: "CREATED",
      actorId: auth.user.userId,
    }).catch((e) => console.error("[POST /api/org/custom-roles] Audit error:", e));

    return NextResponse.json({ role: created }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}

