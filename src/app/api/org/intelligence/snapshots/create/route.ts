/**
 * POST /api/org/intelligence/snapshots/create
 * Create a new intelligence snapshot (on-demand).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 * 
 * Computes current intelligence findings and persists them with Loopbrain indexing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { createIntelligenceSnapshot } from "@/server/org/intelligence/snapshots";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { handleApiError } from "@/lib/api-errors";
import { CreateIntelligenceSnapshotSchema } from "@/lib/validations/org";

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (verifies workspace membership and role)
    // Using MEMBER role since snapshot creation creates persistent records and triggers indexing
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body (optional source field)
    const body = CreateIntelligenceSnapshotSchema.parse(await request.json().catch(() => ({})));

    // Step 5: Create snapshot (computes findings and persists them)
    const snapshot = await createIntelligenceSnapshot({ source: body.source, workspaceId });

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    await emitOrgContextObject({
      workspaceId,
      actorUserId: userId,
      action: "org.intelligence.snapshot_created",
      entity: { type: "org", id: snapshot.id } as any,
      payload: {
        snapshotId: snapshot.id,
        findingCount: snapshot.findingCount,
        source: body.source,
      },
    });

    return NextResponse.json(
      {
        id: snapshot.id,
        createdAt: snapshot.createdAt.toISOString(),
        findingCount: snapshot.findingCount,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

