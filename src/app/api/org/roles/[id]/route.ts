import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

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
  } catch (error) {
    console.error("Failed to fetch role:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch role" },
      { status: 500 }
    );
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
    const body = await request.json();
    const { name, description, responsibilities } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Role name is required" },
        { status: 400 }
      );
    }

    // Verify role exists and belongs to org
    const existingRole = await prisma.role.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!existingRole) {
      return NextResponse.json(
        { ok: false, error: "Role not found" },
        { status: 404 }
      );
    }

    if (existingRole.orgId !== workspaceId) {
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
            .filter((r: any) => r.target && r.target.trim().length > 0)
            .map((r: any) => ({
              scope: r.scope,
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
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update role" },
      { status: 500 }
    );
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
      select: { orgId: true },
    });

    if (!existingRole) {
      return NextResponse.json(
        { ok: false, error: "Role not found" },
        { status: 404 }
      );
    }

    if (existingRole.orgId !== workspaceId) {
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
  } catch (error) {
    console.error("Failed to delete role:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete role" },
      { status: 500 }
    );
  }
}

