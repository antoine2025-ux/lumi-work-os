/**
 * GET/POST /api/org/work/[id]/impact
 *
 * Phase J: Impact & Dependency Graph API
 *
 * GET: Retrieve impact graph for a work request
 * POST: Create explicit impact (returns fresh resolution)
 *
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { resolveWorkImpact } from "@/lib/org/impact/resolveWorkImpact";
import {
  createExplicitImpact,
  hasReverseImpact,
} from "@/lib/org/impact/read";
// Note: impactKey is computed via createExplicitImpact (single source of truth)
import type { ImpactSubjectType, ImpactType, ImpactSeverity } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

// ============================================================================
// GET /api/org/work/[id]/impact
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Step 4: Fetch work request
    const workRequest = await prisma.workRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Step 5: Parse query params
    const searchParams = request.nextUrl.searchParams;
    const includeInferred = searchParams.get("includeInferred") !== "false";

    // Step 6: Resolve impact
    const result = await resolveWorkImpact(workspaceId, workRequest, {
      includeInferred,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/work/[id]/impact] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/org/work/[id]/impact
// ============================================================================

type CreateImpactBody = {
  subjectType: ImpactSubjectType;
  subjectId?: string;
  roleType?: string;
  domainKey?: string;
  impactType: ImpactType;
  severity: ImpactSeverity;
  explanation: string;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workRequestId } = await params;

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

    // Step 4: Fetch work request
    const workRequest = await prisma.workRequest.findFirst({
      where: {
        id: workRequestId,
        workspaceId,
      },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Step 5: Parse and validate body
    const body = (await request.json()) as CreateImpactBody;

    // Validate required fields
    if (!body.subjectType || !body.impactType || !body.severity || !body.explanation) {
      return NextResponse.json(
        { error: "Missing required fields: subjectType, impactType, severity, explanation" },
        { status: 400 }
      );
    }

    // Validate subject identity based on type
    const subjectId = body.subjectId ?? null;
    const roleType = body.roleType ?? null;
    const domainKey = body.domainKey ?? null;

    if (body.subjectType === "ROLE" && !roleType) {
      return NextResponse.json(
        { error: "roleType is required for ROLE subject type" },
        { status: 400 }
      );
    }
    if (body.subjectType === "DECISION_DOMAIN" && !domainKey) {
      return NextResponse.json(
        { error: "domainKey is required for DECISION_DOMAIN subject type" },
        { status: 400 }
      );
    }
    if (
      ["TEAM", "DEPARTMENT", "PERSON", "WORK_REQUEST"].includes(body.subjectType) &&
      !subjectId
    ) {
      return NextResponse.json(
        { error: `subjectId is required for ${body.subjectType} subject type` },
        { status: 400 }
      );
    }

    // Step 6: Validation rule 1 - Self-reference check
    if (body.subjectType === "WORK_REQUEST" && subjectId === workRequestId) {
      return NextResponse.json(
        { error: "Work request cannot impact itself (self-reference)" },
        { status: 400 }
      );
    }

    // Step 7: Validation rule 2 - Two-node cycle check
    if (body.subjectType === "WORK_REQUEST" && subjectId) {
      const hasCycle = await hasReverseImpact(
        workspaceId,
        workRequestId,
        subjectId,
        body.impactType
      );
      if (hasCycle) {
        return NextResponse.json(
          { error: "Creating this impact would form a cycle (reverse edge exists)" },
          { status: 400 }
        );
      }
    }

    // Step 8: Create the impact
    const createdImpact = await createExplicitImpact({
      workspaceId,
      workRequestId,
      subjectType: body.subjectType,
      subjectId,
      roleType,
      domainKey,
      impactType: body.impactType,
      severity: body.severity,
      explanation: body.explanation,
      createdById: userId,
    });

    // Step 9: Re-resolve the full impact graph
    const result = await resolveWorkImpact(workspaceId, workRequest);

    return NextResponse.json({
      ok: true,
      created: {
        id: createdImpact.id,
        impactKey: createdImpact.impactKey,
      },
      ...result,
    });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return NextResponse.json(
        { error: "An impact with this subject and type already exists" },
        { status: 409 }
      );
    }

    console.error("[POST /api/org/work/[id]/impact] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
