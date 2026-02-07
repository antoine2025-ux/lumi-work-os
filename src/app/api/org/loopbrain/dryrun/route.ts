/**
 * GET /api/org/loopbrain/dryrun
 *
 * Dev-only: returns snapshot + answerable/blocked questions for debugging.
 * No model calls. Purely for development.
 *
 * This endpoint MUST NOT be used by production Loopbrain ingestion.
 * See docs/loopbrain/ingest-contract.v0.md.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { buildOrgSemanticSnapshotV0 } from "@/lib/org/snapshot/buildOrgSemanticSnapshotV0";
import { LOOPBRAIN_QUESTIONS_V0 } from "@/lib/loopbrain/contract/questions.v0";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dry-run endpoint is only available in development" },
      { status: 404 }
    );
  }

  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const snapshot = await buildOrgSemanticSnapshotV0({ workspaceId });
    const blockerSet = new Set(snapshot.readiness.blockers);

    const answerableQuestions: string[] = [];
    const blockedQuestions: { id: string; blockers: string[] }[] = [];

    for (const q of LOOPBRAIN_QUESTIONS_V0) {
      const intersecting = q.blockingOn.filter((b) => blockerSet.has(b));
      if (intersecting.length === 0) {
        answerableQuestions.push(q.id);
      } else {
        blockedQuestions.push({ id: q.id, blockers: intersecting });
      }
    }

    const headers = new Headers();
    headers.set("Cache-Control", "no-store");

    return NextResponse.json(
      {
        ok: true,
        snapshot,
        answerableQuestions,
        blockedQuestions,
      },
      { headers }
    );
  } catch (error: unknown) {
    console.error("[GET /api/org/loopbrain/dryrun] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load dry-run",
      },
      { status: 500 }
    );
  }
}
