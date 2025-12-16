import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";

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
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch roles" },
      { status: 500 }
    );
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

    const body = await request.json();
    const { name, description, responsibilities } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Role name is required" },
        { status: 400 }
      );
    }

    // Create role with responsibilities
    const role = await prisma.role.create({
      data: {
        orgId,
        name: name.trim(),
        description: description?.trim() || null,
        responsibilities: {
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
    console.error("Failed to create role:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create role" },
      { status: 500 }
    );
  }
}
