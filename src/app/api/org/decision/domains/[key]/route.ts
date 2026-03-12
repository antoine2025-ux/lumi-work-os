/**
 * GET/PUT/DELETE /api/org/decision/domains/[key]
 * 
 * Get, update, or archive a decision domain.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { getDecisionResponseMeta } from "@/lib/org/decision/types";

type RouteParams = { params: Promise<{ key: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Fetch domain
    const domain = await prisma.decisionDomain.findFirst({
      where: {
        workspaceId,
        key: key.toUpperCase(),
      },
      include: {
        authority: {
          include: {
            escalationSteps: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Resolve person names for authority
    let primaryPersonName: string | null = null;
    if (domain.authority?.primaryPersonId) {
      const user = await prisma.user.findUnique({
        where: { id: domain.authority.primaryPersonId },
        select: { name: true, email: true },
      });
      primaryPersonName = user?.name ?? user?.email ?? null;
    }

    const escalationWithNames = await Promise.all(
      (domain.authority?.escalationSteps ?? []).map(async (step) => {
        let personName: string | null = null;
        if (step.personId) {
          const user = await prisma.user.findUnique({
            where: { id: step.personId },
            select: { name: true, email: true },
          });
          personName = user?.name ?? user?.email ?? null;
        }
        return {
          stepOrder: step.stepOrder,
          personId: step.personId,
          personName,
          roleType: step.roleType,
          configuredAs: step.personId ? "PERSON" : "ROLE",
        };
      })
    );

    return NextResponse.json({
      ok: true,
      domain: {
        id: domain.id,
        key: domain.key,
        name: domain.name,
        description: domain.description,
        scope: domain.scope,
        isArchived: domain.isArchived,
        authority: domain.authority
          ? {
              primaryPersonId: domain.authority.primaryPersonId,
              primaryPersonName,
              primaryRoleType: domain.authority.primaryRoleType,
              primaryConfiguredAs: domain.authority.primaryPersonId ? "PERSON" : "ROLE",
              escalationSteps: escalationWithNames,
            }
          : null,
        createdAt: domain.createdAt.toISOString(),
        updatedAt: domain.updatedAt.toISOString(),
      },
      responseMeta: getDecisionResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Fetch existing domain
    const existing = await prisma.decisionDomain.findFirst({
      where: {
        workspaceId,
        key: key.toUpperCase(),
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Step 5: Parse and validate request body
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.scope !== undefined) {
      const validScopes = ["TEAM", "DEPARTMENT", "FUNCTION", "WORKSPACE"];
      if (!validScopes.includes(body.scope)) {
        return NextResponse.json(
          { error: `scope must be one of: ${validScopes.join(", ")}` },
          { status: 400 }
        );
      }
      updates.scope = body.scope;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Step 6: Update domain
    const domain = await prisma.decisionDomain.update({
      where: { id: existing.id },
      data: updates,
    });

    return NextResponse.json({
      ok: true,
      domain: {
        id: domain.id,
        key: domain.key,
        name: domain.name,
        description: domain.description,
        scope: domain.scope,
        isArchived: domain.isArchived,
        createdAt: domain.createdAt.toISOString(),
        updatedAt: domain.updatedAt.toISOString(),
      },
      responseMeta: getDecisionResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Fetch existing domain
    const existing = await prisma.decisionDomain.findFirst({
      where: {
        workspaceId,
        key: key.toUpperCase(),
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Step 5: Archive (soft-delete)
    const domain = await prisma.decisionDomain.update({
      where: { id: existing.id },
      data: { isArchived: true },
    });

    return NextResponse.json({
      ok: true,
      domain: {
        id: domain.id,
        key: domain.key,
        name: domain.name,
        isArchived: domain.isArchived,
      },
      responseMeta: getDecisionResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
