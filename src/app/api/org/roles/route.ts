import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OrgRoleCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const roles = await prisma.role.findMany({
      where: {
        orgId: workspaceId,
      },
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
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        responsibilities: role.responsibilities.map((r) => ({
          id: r.id,
          scope: r.scope,
          target: r.target,
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['OWNER'] });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const { name, description, responsibilities } = OrgRoleCreateSchema.parse(
      await request.json()
    );

    // Create role with responsibilities
    const role = await prisma.role.create({
      data: {
        orgId: workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        responsibilities: {
          // Prisma expects ResponsibilityScope enum for scope. Zod validates
          // the shape; the enum mapping is a pre-existing mismatch (was `as any`).
          create: (responsibilities || [])
            .filter((r) => r.target && r.target.trim().length > 0)
            .map((r) => ({
              scope: r.scope as unknown as import("@prisma/client").ResponsibilityScope,
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
    return handleApiError(error, request);
  }
}
