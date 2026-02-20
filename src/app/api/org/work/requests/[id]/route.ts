/**
 * GET/PUT /api/org/work/requests/[id]
 * 
 * Get or update a single work request.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import {
  getOrCreateWorkspaceEffortDefaults,
  getEstimatedEffortHours,
} from "@/lib/org/work/effortDefaults";
import { getWorkRequestResponseMeta } from "@/lib/org/work/types";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { resolveWorkFeasibility } from "@/lib/org/work/resolveWorkFeasibility";
import { resolveWorkImpact } from "@/lib/org/impact/resolveWorkImpact";
import { getDefaultIssueWindow } from "@/lib/org/capacity/thresholds";
import {
  buildResponseMeta,
  type WorkPatch,
  type MutationResult,
} from "@/lib/org/mutations/types";
import { computeIssueResolution } from "@/lib/org/mutations/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Step 4: Fetch work request
    const workRequest = await prisma.workRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!workRequest) {
      return NextResponse.json({ ok: false, error: "Work request not found" }, { status: 404 });
    }

    // Get effort defaults for conversion
    const effortDefaults = await getOrCreateWorkspaceEffortDefaults(workspaceId);

    return NextResponse.json({
      ok: true,
      request: {
        id: workRequest.id,
        title: workRequest.title,
        description: workRequest.description,
        priority: workRequest.priority,
        desiredStart: workRequest.desiredStart.toISOString(),
        desiredEnd: workRequest.desiredEnd.toISOString(),
        effortType: workRequest.effortType,
        effortHours: workRequest.effortHours,
        effortTShirt: workRequest.effortTShirt,
        estimatedEffortHours: getEstimatedEffortHours(workRequest, effortDefaults),
        domainType: workRequest.domainType,
        domainId: workRequest.domainId,
        requiredRoleType: workRequest.requiredRoleType,
        requiredSeniority: workRequest.requiredSeniority,
        requesterPersonId: workRequest.requesterPersonId,
        createdById: workRequest.createdById,
        status: workRequest.status,
        isProvisional: workRequest.isProvisional,
        closedAt: workRequest.closedAt?.toISOString() ?? null,
        createdAt: workRequest.createdAt.toISOString(),
        updatedAt: workRequest.updatedAt.toISOString(),
      },
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/work/requests/[id]] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Step 4: Check if work request exists
    const existing = await prisma.workRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Work request not found" }, { status: 404 });
    }

    // Cannot update closed requests
    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: "Cannot update a closed work request" },
        { status: 400 }
      );
    }

    // Step 5: Parse and validate request body
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Optional updates
    if (body.title !== undefined) {
      if (!body.title?.trim()) {
        return NextResponse.json({ ok: false, error: "title cannot be empty" }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.priority !== undefined) {
      const validPriorities = ["P0", "P1", "P2", "P3"];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          { ok: false, error: `priority must be one of: ${validPriorities.join(", ")}` },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (body.desiredStart !== undefined || body.desiredEnd !== undefined) {
      const desiredStart = body.desiredStart ? new Date(body.desiredStart) : existing.desiredStart;
      const desiredEnd = body.desiredEnd ? new Date(body.desiredEnd) : existing.desiredEnd;

      if (isNaN(desiredStart.getTime()) || isNaN(desiredEnd.getTime())) {
        return NextResponse.json(
          { ok: false, error: "Invalid date format. Use ISO 8601 UTC" },
          { status: 400 }
        );
      }

      if (desiredEnd <= desiredStart) {
        return NextResponse.json(
          { ok: false, error: "desiredEnd must be after desiredStart" },
          { status: 400 }
        );
      }

      if (body.desiredStart !== undefined) updates.desiredStart = desiredStart;
      if (body.desiredEnd !== undefined) updates.desiredEnd = desiredEnd;
    }

    if (body.effortType !== undefined) {
      const validEffortTypes = ["HOURS", "TSHIRT"];
      if (!validEffortTypes.includes(body.effortType)) {
        return NextResponse.json(
          { ok: false, error: `effortType must be one of: ${validEffortTypes.join(", ")}` },
          { status: 400 }
        );
      }
      updates.effortType = body.effortType;
    }

    if (body.effortHours !== undefined) {
      updates.effortHours = body.effortHours;
    }

    if (body.effortTShirt !== undefined) {
      if (body.effortTShirt !== null) {
        const validTShirtSizes = ["XS", "S", "M", "L", "XL"];
        if (!validTShirtSizes.includes(body.effortTShirt)) {
          return NextResponse.json(
            { ok: false, error: `effortTShirt must be one of: ${validTShirtSizes.join(", ")}` },
            { status: 400 }
          );
        }
      }
      updates.effortTShirt = body.effortTShirt;
    }

    if (body.domainType !== undefined) {
      const validDomainTypes = ["TEAM", "DEPARTMENT", "ROLE", "FUNCTION", "OTHER"];
      if (!validDomainTypes.includes(body.domainType)) {
        return NextResponse.json(
          { ok: false, error: `domainType must be one of: ${validDomainTypes.join(", ")}` },
          { status: 400 }
        );
      }
      updates.domainType = body.domainType;
    }

    if (body.domainId !== undefined) {
      updates.domainId = body.domainId;
    }

    if (body.requiredRoleType !== undefined) {
      updates.requiredRoleType = body.requiredRoleType;
    }

    if (body.requiredSeniority !== undefined) {
      if (body.requiredSeniority !== null) {
        const validSeniorities = ["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"];
        if (!validSeniorities.includes(body.requiredSeniority)) {
          return NextResponse.json(
            { ok: false, error: `requiredSeniority must be one of: ${validSeniorities.join(", ")}` },
            { status: 400 }
          );
        }
      }
      updates.requiredSeniority = body.requiredSeniority;
    }

    if (body.requesterPersonId !== undefined) {
      updates.requesterPersonId = body.requesterPersonId;
    }

    // O1: Allow converting provisional → normal (never the reverse)
    if (body.isProvisional !== undefined) {
      if (body.isProvisional === false && existing.isProvisional === true) {
        updates.isProvisional = false;
      } else if (body.isProvisional === true) {
        return NextResponse.json(
          { ok: false, error: "Cannot set isProvisional to true via API" },
          { status: 400 }
        );
      }
      // isProvisional: false on already non-provisional is a no-op, skip
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
    }

    // Step 6: Determine time window (use request body or default)
    const timeWindow = body.timeWindow
      ? { start: new Date(body.timeWindow.start), end: new Date(body.timeWindow.end) }
      : getDefaultIssueWindow();

    // Step 7: Compute issues BEFORE mutation (scoped to work request)
    // TODO: Enhance to derive actual work request issues
    const issuesBefore: OrgIssueMetadata[] = [];

    // Step 8: Update work request
    const workRequest = await prisma.workRequest.update({
      where: { id },
      data: updates,
    });

    // Get effort defaults for conversion
    const effortDefaults = await getOrCreateWorkspaceEffortDefaults(workspaceId);

    // Step 9: Resolve feasibility and impact
    const [feasibility, impact] = await Promise.all([
      resolveWorkFeasibility(workspaceId, workRequest),
      resolveWorkImpact(workspaceId, workRequest),
    ]);

    // Step 10: Compute issues AFTER mutation (same scoped set)
    // TODO: Enhance to derive actual work request issues
    const issuesAfter: OrgIssueMetadata[] = [];

    // Step 11: Build response metadata
    const responseMeta = buildResponseMeta("mutation:work-request-update:v1");

    // Step 12: Diff issues to determine active vs resolved
    const affectedIssues = computeIssueResolution(
      issuesBefore,
      issuesAfter,
      responseMeta.mutationId
    );

    // Step 13: Build response data
    const requestData = {
      id: workRequest.id,
      title: workRequest.title,
      description: workRequest.description,
      priority: workRequest.priority,
      desiredStart: workRequest.desiredStart.toISOString(),
      desiredEnd: workRequest.desiredEnd.toISOString(),
      effortType: workRequest.effortType,
      effortHours: workRequest.effortHours,
      effortTShirt: workRequest.effortTShirt,
      estimatedEffortHours: getEstimatedEffortHours(workRequest, effortDefaults),
      domainType: workRequest.domainType,
      domainId: workRequest.domainId,
      requiredRoleType: workRequest.requiredRoleType,
      requiredSeniority: workRequest.requiredSeniority,
      requesterPersonId: workRequest.requesterPersonId,
      createdById: workRequest.createdById,
      status: workRequest.status,
      isProvisional: workRequest.isProvisional,
      closedAt: workRequest.closedAt?.toISOString() ?? null,
      createdAt: workRequest.createdAt.toISOString(),
      updatedAt: workRequest.updatedAt.toISOString(),
    };

    // Step 14: Return canonical MutationResult
    const response: MutationResult<typeof requestData, WorkPatch> = {
      ok: true,
      data: requestData,
      patch: {
        patchVersion: 1,
        updatedFeasibility: {
          canStaff: feasibility.feasibility.canStaff,
          capacityGapHours: feasibility.feasibility.capacityGapHours,
          recommendation: feasibility.recommendation,
        },
        updatedImpact: {
          totalCount: impact.impacts.length,
          highestSeverity: impact.summary.highestSeverity,
        },
        timeWindow: {
          start: timeWindow.start.toISOString(),
          end: timeWindow.end.toISOString(),
        },
      },
      scope: {
        entityType: "WORK_REQUEST",
        entityId: id,
        related: impact.impacts
          .filter((i) => i.subjectType === "DECISION_DOMAIN" && i.subjectId)
          .map((i) => ({ entityType: "DECISION_DOMAIN", entityId: i.subjectId! })),
      },
      affectedIssues,
      responseMeta,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[PUT /api/org/work/requests/[id]] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
