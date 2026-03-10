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
import { handleApiError } from "@/lib/api-errors";
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
import { UpdateWorkRequestSchema } from "@/lib/validations/org";

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
    return handleApiError(error, request);
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
    const body = UpdateWorkRequestSchema.parse(await request.json());
    const updates: Record<string, unknown> = {};

    // Optional updates
    if (body.title !== undefined) {
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }

    if (body.desiredStart !== undefined || body.desiredEnd !== undefined) {
      const desiredStart = body.desiredStart ? new Date(body.desiredStart) : existing.desiredStart;
      const desiredEnd = body.desiredEnd ? new Date(body.desiredEnd) : existing.desiredEnd;

      if (body.desiredStart !== undefined) updates.desiredStart = desiredStart;
      if (body.desiredEnd !== undefined) updates.desiredEnd = desiredEnd;
    }

    if (body.effortType !== undefined) {
      updates.effortType = body.effortType;
    }

    if (body.effortHours !== undefined) {
      updates.effortHours = body.effortHours;
    }

    if (body.effortTShirt !== undefined) {
      updates.effortTShirt = body.effortTShirt;
    }

    if (body.domainType !== undefined) {
      updates.domainType = body.domainType;
    }

    if (body.domainId !== undefined) {
      updates.domainId = body.domainId;
    }

    if (body.requiredRoleType !== undefined) {
      updates.requiredRoleType = body.requiredRoleType;
    }

    if (body.requiredSeniority !== undefined) {
      updates.requiredSeniority = body.requiredSeniority;
    }

    if (body.requesterPersonId !== undefined) {
      updates.requesterPersonId = body.requesterPersonId;
    }

    // O1: Allow converting provisional → normal (never the reverse)
    if (body.provisional !== undefined) {
      if (body.provisional === false && existing.isProvisional === true) {
        updates.isProvisional = false;
      } else if (body.provisional === true) {
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
    const timeWindow = (body as any).timeWindow
      ? { start: new Date((body as any).timeWindow.start), end: new Date((body as any).timeWindow.end) }
      : getDefaultIssueWindow();

    // Step 7: Compute issues BEFORE mutation (scoped to work request)
    // TODO [BACKLOG]: Derive actual work request issues
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
    // TODO [BACKLOG]: Derive actual work request issues
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
    return handleApiError(error, request);
  }
}
