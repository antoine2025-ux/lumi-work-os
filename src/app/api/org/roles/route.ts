import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";
import { OrgRoleCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext(request);
    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const orgId = ctx.orgId;
    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "No organization membership" },
        { status: 403 }
      );
    }

    const roles = await prisma.role.findMany({
      where: {
        orgId,
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
    const ctx = await getOrgContext(request);
    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const orgId = ctx.orgId;
    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "No organization membership" },
        { status: 403 }
      );
    }

    const { name, description, responsibilities } = OrgRoleCreateSchema.parse(
      await request.json()
    );

    // Create role with responsibilities
    const role = await prisma.role.create({
      data: {
        orgId,
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
