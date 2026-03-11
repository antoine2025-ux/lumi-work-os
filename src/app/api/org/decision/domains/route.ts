/**
 * GET/POST /api/org/decision/domains
 * 
 * List and create decision domains.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
import { getDecisionResponseMeta } from "@/lib/org/decision/types";
import { DecisionDomainCreateSchema } from "@/lib/validations/org";

export async function GET(request: NextRequest) {
  try {
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

    // Step 4: Parse query params
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    // Step 5: Fetch domains
    const domains = await prisma.decisionDomain.findMany({
      where: {
        workspaceId,
        ...(includeArchived ? {} : { isArchived: false }),
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
      orderBy: { key: "asc" },
    });

    // Step 6: Serialize
    const serialized = domains.map((domain) => ({
      id: domain.id,
      key: domain.key,
      name: domain.name,
      description: domain.description,
      scope: domain.scope,
      isArchived: domain.isArchived,
      hasAuthority: !!domain.authority,
      primaryType: domain.authority?.primaryPersonId
        ? "PERSON"
        : domain.authority?.primaryRoleType
        ? "ROLE"
        : null,
      escalationCount: domain.authority?.escalationSteps.length ?? 0,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      domains: serialized,
      count: serialized.length,
      responseMeta: getDecisionResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require ADMIN for creating domains)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body (Zod)
    const body = DecisionDomainCreateSchema.parse(await request.json());

    // Normalize key to uppercase
    const key = body.key.trim().toUpperCase().replace(/\s+/g, "_");

    // Validate key format (alphanumeric + underscore only) — business logic check
    if (!/^[A-Z0-9_]+$/.test(key)) {
      return NextResponse.json(
        { error: "key must contain only letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Check for duplicate key
    const existing = await prisma.decisionDomain.findFirst({
      where: { workspaceId, key },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Domain with key '${key}' already exists` },
        { status: 409 }
      );
    }

    // Step 5: Create domain
    const domain = await prisma.decisionDomain.create({
      data: {
        workspaceId,
        key,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        scope: body.scope ?? "WORKSPACE",
      },
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
        hasAuthority: false,
        primaryType: null,
        escalationCount: 0,
        createdAt: domain.createdAt.toISOString(),
        updatedAt: domain.updatedAt.toISOString(),
      },
      responseMeta: getDecisionResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
