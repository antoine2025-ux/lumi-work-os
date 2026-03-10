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
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { ResolveIntegrityIssueSchema } from '@/lib/validations/org';

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
    const body = ResolveIntegrityIssueSchema.parse(await request.json());
    const { issueId, resolution, notes } = body;

    // Use issueId as the issueKey directly
    const issueKey = issueId;

    // Step 7: Delete resolution if resolution is to reopen (not applicable with current schema)
    // The schema only allows FIXED, IGNORED, DEFERRED
    if (false) {
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
        issueType: issueId.split(':')[0] || 'UNKNOWN',
        entityType: issueId.split(':')[1] || 'UNKNOWN',
        entityId: issueId.split(':')[2] || issueId,
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote: notes ?? null,
      },
      update: {
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote: notes ?? null,
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
        resolution: resolution,
        resolutionNote: result.resolutionNote,
        resolvedById: result.resolvedBy,
        resolvedAt: result.resolvedAt.toISOString(),
      },
      persisted: true,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

