/**
 * GET/POST /api/org/capacity/contract
 * 
 * List and create capacity contracts.
 * 
 * GET: List contracts for a person (query param: personId)
 * POST: Create a new capacity contract
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveEffectiveCapacity } from "@/lib/org/capacity/resolveEffectiveCapacity";
import {
  buildResponseMeta,
  type CapacityPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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

    // Step 4: Get query params
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId");

    if (!personId) {
      return NextResponse.json(
        { ok: false, error: "personId query parameter is required" },
        { status: 400 }
      );
    }

    // Step 5: Fetch contracts
    const contracts = await prisma.capacityContract.findMany({
      where: {
        workspaceId,
        personId,
      },
      orderBy: { effectiveFrom: "desc" },
      select: {
        id: true,
        personId: true,
        weeklyCapacityHours: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      contracts: contracts.map((c) => ({
        id: c.id,
        personId: c.personId,
        weeklyCapacityHours: c.weeklyCapacityHours,
        effectiveFrom: c.effectiveFrom.toISOString(),
        effectiveTo: c.effectiveTo?.toISOString() ?? null,
        createdById: c.createdById,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/capacity/contract] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require ADMIN for creating contracts)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();

    // Validate required fields
    if (!body.personId) {
      return NextResponse.json({ ok: false, error: "personId is required" }, { status: 400 });
    }

    if (body.weeklyCapacityHours === undefined || body.weeklyCapacityHours === null) {
      return NextResponse.json({ ok: false, error: "weeklyCapacityHours is required" }, { status: 400 });
    }

    const weeklyCapacityHours = Number(body.weeklyCapacityHours);
    if (isNaN(weeklyCapacityHours) || weeklyCapacityHours < 0 || weeklyCapacityHours > 168) {
      return NextResponse.json(
        { ok: false, error: "weeklyCapacityHours must be between 0 and 168" },
        { status: 400 }
      );
    }

    if (!body.effectiveFrom) {
      return NextResponse.json({ ok: false, error: "effectiveFrom is required" }, { status: 400 });
    }

    const effectiveFrom = new Date(body.effectiveFrom);
    if (isNaN(effectiveFrom.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid effectiveFrom date" }, { status: 400 });
    }

    const effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;
    if (effectiveTo && isNaN(effectiveTo.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid effectiveTo date" }, { status: 400 });
    }

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      return NextResponse.json(
        { ok: false, error: "effectiveTo must be after effectiveFrom" },
        { status: 400 }
      );
    }

    // Step 5: Verify person exists in workspace
    const position = await prisma.orgPosition.findFirst({
      where: {
        workspaceId,
        OR: [
          { id: body.personId },
          { userId: body.personId },
        ],
        isActive: true,
      },
      select: { userId: true },
    });

    if (!position?.userId) {
      return NextResponse.json({ ok: false, error: "Person not found in workspace" }, { status: 404 });
    }

    // Step 6: Compute issues BEFORE mutation (scoped to person)
    // TODO: Enhance to derive actual capacity issues for the person
    const issuesBefore: OrgIssueMetadata[] = [];

    // Step 7: Create the contract
    const created = await prisma.capacityContract.create({
      data: {
        workspaceId,
        personId: position.userId,
        weeklyCapacityHours,
        effectiveFrom,
        effectiveTo,
        createdById: userId,
      },
      select: {
        id: true,
        personId: true,
        weeklyCapacityHours: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Step 8: Compute issues AFTER mutation (same scoped set)
    // TODO: Enhance to derive actual capacity issues for the person
    const issuesAfter: OrgIssueMetadata[] = [];

    // Step 9: Build response metadata
    const responseMeta = buildResponseMeta("mutation:capacity-contract-create:v1");

    // Step 10: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 11: Compute updated effective capacity for the person
    const window = {
      start: effectiveFrom,
      end: effectiveTo ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const effectiveCapacity = await resolveEffectiveCapacity(
      workspaceId,
      position.userId,
      window
    );

    // Step 12: Return canonical MutationResult
    const contractData = {
      id: created.id,
      personId: created.personId,
      weeklyCapacityHours: created.weeklyCapacityHours,
      effectiveFrom: created.effectiveFrom.toISOString(),
      effectiveTo: created.effectiveTo?.toISOString() ?? null,
      createdById: created.createdById,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    const response: MutationResult<typeof contractData, CapacityPatch> = {
      ok: true,
      data: contractData,
      patch: {
        patchVersion: 1,
        updatedEffectiveCapacity: {
          personId: position.userId,
          weeklyCapacityHours: effectiveCapacity.weeklyCapacityHours,
          effectiveAvailableHours: effectiveCapacity.effectiveAvailableHours,
          utilizationPercent: effectiveCapacity.utilizationPercent,
        },
      },
      scope: {
        entityType: "PERSON",
        entityId: position.userId,
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[POST /api/org/capacity/contract] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
