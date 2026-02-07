/**
 * GET/POST /api/org/work/requests
 * 
 * List and create work requests.
 * 
 * GET: List work requests (optional query params: status, priority, domainType)
 * POST: Create a new work request
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
import type { Prisma, WorkRequestStatus, WorkPriority, WorkDomainType } from "@prisma/client";

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
    const status = searchParams.get("status") as WorkRequestStatus | null;
    const priority = searchParams.get("priority") as WorkPriority | null;
    const domainType = searchParams.get("domainType") as WorkDomainType | null;

    // Step 5: Build query
    const where: Prisma.WorkRequestWhereInput = {
      workspaceId,
    };

    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (domainType) {
      where.domainType = domainType;
    }

    // Step 6: Fetch work requests with latest recommendation log
    const requests = await prisma.workRequest.findMany({
      where,
      orderBy: [
        { priority: "asc" },
        { desiredStart: "asc" },
      ],
      include: {
        recommendationLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            recommendationAction: true,
            acknowledgedAt: true,
          },
        },
      },
    });

    // Step 7: Get effort defaults for conversion
    const effortDefaults = await getOrCreateWorkspaceEffortDefaults(workspaceId);

    // Step 8: Serialize responses (sort order unchanged — no recommendation-based reordering)
    const serialized = requests.map((req) => {
      const latestLog = req.recommendationLogs[0] ?? null;
      return {
        id: req.id,
        title: req.title,
        description: req.description,
        priority: req.priority,
        desiredStart: req.desiredStart.toISOString(),
        desiredEnd: req.desiredEnd.toISOString(),
        effortType: req.effortType,
        effortHours: req.effortHours,
        effortTShirt: req.effortTShirt,
        estimatedEffortHours: getEstimatedEffortHours(req, effortDefaults),
        domainType: req.domainType,
        domainId: req.domainId,
        requiredRoleType: req.requiredRoleType,
        requiredSeniority: req.requiredSeniority,
        requesterPersonId: req.requesterPersonId,
        createdById: req.createdById,
        status: req.status,
        closedAt: req.closedAt?.toISOString() ?? null,
        isProvisional: req.isProvisional,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        // W1.5: Latest recommendation state
        latestRecommendationAction: latestLog?.recommendationAction ?? null,
        latestAcknowledgedAt: latestLog?.acknowledgedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      requests: serialized,
      count: serialized.length,
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/work/requests] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();
    const isProvisional = body.provisional === true;

    // Required fields
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // O1: Provisional creation — relaxed defaults for onboarding
    if (isProvisional) {
      // Guard: only one provisional per workspace (regardless of status).
      // A provisional must be converted (isProvisional = false) before creating another.
      const existingProvisional = await prisma.workRequest.count({
        where: { workspaceId, isProvisional: true },
      });
      if (existingProvisional > 0) {
        return NextResponse.json(
          { error: "A provisional work request already exists. Convert it first." },
          { status: 409 }
        );
      }

      // requiredRoleType is required for provisional
      if (!body.requiredRoleType?.trim()) {
        return NextResponse.json(
          { error: "requiredRoleType is required for provisional work requests" },
          { status: 400 }
        );
      }

      // Apply relaxed defaults
      const now = new Date();
      const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const priority = body.priority || "P2";
      const domainType = body.domainType || "OTHER";
      const desiredStart = body.desiredStart ? new Date(body.desiredStart) : now;
      const desiredEnd = body.desiredEnd ? new Date(body.desiredEnd) : defaultEnd;
      const effortType = body.effortType || "HOURS";

      const workRequest = await prisma.workRequest.create({
        data: {
          workspaceId,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          priority,
          desiredStart,
          desiredEnd,
          effortType,
          effortHours: body.effortHours ?? null,
          effortTShirt: body.effortTShirt ?? null,
          domainType,
          domainId: body.domainId ?? null,
          requiredRoleType: body.requiredRoleType.trim(),
          requiredSeniority: body.requiredSeniority ?? null,
          requesterPersonId: body.requesterPersonId ?? null,
          createdById: userId,
          status: "OPEN",
          isProvisional: true,
        },
      });

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
          closedAt: null,
          createdAt: workRequest.createdAt.toISOString(),
          updatedAt: workRequest.updatedAt.toISOString(),
          workTags: [],
        },
      }, { status: 201 });
    }

    // --- Normal (non-provisional) creation ---
    if (!body.priority) {
      return NextResponse.json({ error: "priority is required" }, { status: 400 });
    }
    if (!body.desiredStart || !body.desiredEnd) {
      return NextResponse.json(
        { error: "desiredStart and desiredEnd are required (ISO 8601 UTC)" },
        { status: 400 }
      );
    }
    if (!body.effortType) {
      return NextResponse.json({ error: "effortType is required" }, { status: 400 });
    }
    if (!body.domainType) {
      return NextResponse.json({ error: "domainType is required" }, { status: 400 });
    }

    // Parse dates
    const desiredStart = new Date(body.desiredStart);
    const desiredEnd = new Date(body.desiredEnd);

    if (isNaN(desiredStart.getTime()) || isNaN(desiredEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 UTC" },
        { status: 400 }
      );
    }

    if (desiredEnd <= desiredStart) {
      return NextResponse.json(
        { error: "desiredEnd must be after desiredStart" },
        { status: 400 }
      );
    }

    // Validate effort type constraints
    if (body.effortType === "HOURS" && (body.effortHours === undefined || body.effortHours === null)) {
      return NextResponse.json(
        { error: "effortHours is required when effortType is HOURS" },
        { status: 400 }
      );
    }
    if (body.effortType === "TSHIRT" && !body.effortTShirt) {
      return NextResponse.json(
        { error: "effortTShirt is required when effortType is TSHIRT" },
        { status: 400 }
      );
    }

    // Validate enums
    const validPriorities = ["P0", "P1", "P2", "P3"];
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: `priority must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    const validEffortTypes = ["HOURS", "TSHIRT"];
    if (!validEffortTypes.includes(body.effortType)) {
      return NextResponse.json(
        { error: `effortType must be one of: ${validEffortTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const validDomainTypes = ["TEAM", "DEPARTMENT", "ROLE", "FUNCTION", "OTHER"];
    if (!validDomainTypes.includes(body.domainType)) {
      return NextResponse.json(
        { error: `domainType must be one of: ${validDomainTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.effortTShirt) {
      const validTShirtSizes = ["XS", "S", "M", "L", "XL"];
      if (!validTShirtSizes.includes(body.effortTShirt)) {
        return NextResponse.json(
          { error: `effortTShirt must be one of: ${validTShirtSizes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (body.requiredSeniority) {
      const validSeniorities = ["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"];
      if (!validSeniorities.includes(body.requiredSeniority)) {
        return NextResponse.json(
          { error: `requiredSeniority must be one of: ${validSeniorities.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Step 5: Create work request
    const workRequest = await prisma.workRequest.create({
      data: {
        workspaceId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        priority: body.priority,
        desiredStart,
        desiredEnd,
        effortType: body.effortType,
        effortHours: body.effortHours ?? null,
        effortTShirt: body.effortTShirt ?? null,
        domainType: body.domainType,
        domainId: body.domainId ?? null,
        requiredRoleType: body.requiredRoleType ?? null,
        requiredSeniority: body.requiredSeniority ?? null,
        requesterPersonId: body.requesterPersonId ?? null,
        createdById: userId,
        status: "OPEN",
        isProvisional: false,
        // Phase K: Connect work tags if provided
        workTags: body.workTagIds?.length
          ? { connect: body.workTagIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        workTags: true,
      },
    });

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
        closedAt: null,
        createdAt: workRequest.createdAt.toISOString(),
        updatedAt: workRequest.updatedAt.toISOString(),
        // Phase K: Work tags
        workTags: workRequest.workTags.map((t) => ({
          id: t.id,
          key: t.key,
          label: t.label,
        })),
      },
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[POST /api/org/work/requests] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
