import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';
import { handleApiError } from '@/lib/api-errors';
import { UpdateRoleSchema } from '@/lib/validations/org';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] });
    setWorkspaceContext(auth.workspaceId);

    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        responsibilities: {
          select: {
            id: true,
            scope: true,
            target: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { ok: false, error: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        responsibilities: role.responsibilities.map((r) => ({
          id: r.id,
          scope: r.scope,
          target: r.target,
        })),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['OWNER'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const { id } = await params;
    const body = UpdateRoleSchema.parse(await request.json());
    const { name, description, responsibilities } = body;

    // Verify role exists and belongs to org
    const existingRole = await prisma.role.findUnique({
      where: { id },
      select: { workspaceId: true },
    });

    if (!existingRole) {
      return NextResponse.json(
        { ok: false, error: "Role not found" },
        { status: 404 }
      );
    }

    if (existingRole.workspaceId !== workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update role and replace all responsibilities
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        responsibilities: {
          deleteMany: {}, // Delete all existing responsibilities
          create: (responsibilities || [])
            .filter((r) => r.target && r.target.trim().length > 0)
            .map((r) => ({
              scope: (r.scope ?? 'EXECUTION') as import('@prisma/client').ResponsibilityScope,
              target: r.target.trim(),
            })),
        },
      },
      include: {
        responsibilities: {
          select: {
            id: true,
            scope: true,
            target: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        responsibilities: role.responsibilities.map((r) => ({
          id: r.id,
          scope: r.scope,
          target: r.target,
        })),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['OWNER'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const { id } = await params;

    // Verify role exists and belongs to org
    const existingRole = await prisma.role.findUnique({
      where: { id },
      select: { workspaceId: true },
    });

    if (!existingRole) {
      return NextResponse.json(
        { ok: false, error: "Role not found" },
        { status: 404 }
      );
    }

    if (existingRole.workspaceId !== workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete role (responsibilities will be cascade deleted)
    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

