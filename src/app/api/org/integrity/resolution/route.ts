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

    // Step 5: Determine resolvedAt based on resolution
    // On RESOLVED: set resolvedAt = now()
    // On PENDING (reopen): clear resolvedAt
    // On ACKNOWLEDGED/FALSE_POSITIVE: keep existing or set now()
    let resolvedAt: Date | null = null;
    if (body.resolution === "RESOLVED") {
      resolvedAt = new Date();
    } else if (body.resolution === "PENDING") {
      resolvedAt = null; // Clear on reopen
    }
    // For ACKNOWLEDGED and FALSE_POSITIVE, we'll use upsert logic below

    // Step 6: Upsert the resolution record
    // Note: OrgPersonIssue model uses personId for entityId and type for issueType
    // For now, we only support person issues since that's what the model supports
    // Team/department issues would need a separate model or expanded schema
    
    if (body.entityType !== "person" && body.entityType !== "position") {
      // For non-person entities, we can't persist resolution yet
      // Return success but log that it's not persisted
      console.warn(`[PATCH /api/org/integrity/resolution] Cannot persist resolution for entityType: ${body.entityType}`);
      return NextResponse.json({
        ok: true,
        warning: `Resolution for ${body.entityType} issues cannot be persisted yet. Schema expansion needed.`,
        persisted: false,
      });
    }

    // Upsert the issue resolution
    const result = await (prisma as any).orgPersonIssue.upsert({
      where: {
        orgId_personId_type: {
          orgId: workspaceId,
          personId: body.entityId,
          type: body.issueType,
        },
      },
      create: {
        orgId: workspaceId,
        personId: body.entityId,
        type: body.issueType,
        resolution: body.resolution,
        resolutionNote: body.resolutionNote ?? null,
        resolvedById: userId,
        resolvedAt: resolvedAt,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
      update: {
        resolution: body.resolution,
        resolutionNote: body.resolution === "PENDING" 
          ? undefined // Keep existing note on reopen
          : (body.resolutionNote ?? undefined),
        resolvedById: userId,
        resolvedAt: body.resolution === "PENDING" ? null : (body.resolution === "RESOLVED" ? new Date() : undefined),
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      issue: {
        id: result.id,
        resolution: result.resolution,
        resolutionNote: result.resolutionNote,
        resolvedById: result.resolvedById,
        resolvedAt: result.resolvedAt?.toISOString() ?? null,
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

