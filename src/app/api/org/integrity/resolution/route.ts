/**
 * PATCH /api/org/integrity/resolution
 * 
 * Updates the resolution state for an integrity issue.
 * Uses upsert to create or update the persisted resolution record.
 * 
 * Matching key: (workspaceId, entityType, entityId, issueType)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

type Resolution = "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";

type PatchBody = {
  entityType: "person" | "team" | "department" | "position";
  entityId: string;
  issueType: string;
  resolution: Resolution;
  resolutionNote?: string;
};

export async function PATCH(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access - require at least MEMBER role
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate body
    const body: PatchBody = await request.json();

    if (!body.entityType || !body.entityId || !body.issueType || !body.resolution) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: entityType, entityId, issueType, resolution" },
        { status: 400 }
      );
    }

    const validResolutions: Resolution[] = ["PENDING", "ACKNOWLEDGED", "FALSE_POSITIVE", "RESOLVED"];
    if (!validResolutions.includes(body.resolution)) {
      return NextResponse.json(
        { ok: false, error: `Invalid resolution. Must be one of: ${validResolutions.join(", ")}` },
        { status: 400 }
      );
    }

    // Step 6: Build issueKey for reconciliation (PRIMARY IDENTIFIER)
    // Format: `${issueType}:${entityType}:${entityId}`
    const entityTypeUpper = body.entityType.toUpperCase();
    const issueKey = `${body.issueType}:${entityTypeUpper}:${body.entityId}`;

    // Step 7: Upsert the resolution record using OrgIssueResolution (hybrid storage: store resolved by issueKey)
    // Only persist if resolution is not PENDING (PENDING means not resolved, so no record needed)
    if (body.resolution === "PENDING") {
      // Delete resolution record if it exists (reopen issue)
      await prisma.orgIssueResolution.deleteMany({
        where: {
          workspaceId,
          issueKey,
        },
      });

      return NextResponse.json({
        ok: true,
        issue: {
          id: issueKey,
          resolution: "PENDING",
          resolutionNote: null,
          resolvedById: null,
          resolvedAt: null,
        },
        persisted: true,
      });
    }

    // Upsert the resolution record (for RESOLVED, ACKNOWLEDGED, FALSE_POSITIVE)
    const result = await prisma.orgIssueResolution.upsert({
      where: {
        workspaceId_issueKey: {
          workspaceId,
          issueKey,
        },
      },
      create: {
        workspaceId,
        issueKey,
        issueType: body.issueType,
        entityType: entityTypeUpper,
        entityId: body.entityId,
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote: body.resolutionNote ?? null,
      },
      update: {
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote: body.resolutionNote ?? null,
      },
    });

    // Fetch resolver name for response
    const _resolver = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      ok: true,
      issue: {
        id: result.id,
        resolution: body.resolution,
        resolutionNote: result.resolutionNote,
        resolvedById: result.resolvedBy,
        resolvedAt: result.resolvedAt.toISOString(),
      },
      persisted: true,
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/org/integrity/resolution] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update resolution",
      },
      { status: 500 }
    );
  }
}

