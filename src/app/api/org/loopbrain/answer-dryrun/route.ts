/**
 * GET /api/org/loopbrain/answer-dryrun
 *
 * Dev-only: returns snapshot + answerability + envelope scaffold for a given questionId.
 * No model calls. For debugging envelope structure only.
 *
 * This endpoint MUST NOT be used by production Loopbrain inference.
 * See docs/loopbrain/ingest-contract.v0.md.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { buildOrgSemanticSnapshotV0 } from "@/lib/org/snapshot/buildOrgSemanticSnapshotV0";
import {
  LOOPBRAIN_QUESTIONS_V0,
  type LoopbrainQuestionV0,
} from "@/lib/loopbrain/contract/questions.v0";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Answer dry-run endpoint is only available in development" },
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

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { ok: false, error: "Missing required query param: questionId" },
        { status: 400 }
      );
    }

    const question = LOOPBRAIN_QUESTIONS_V0.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unknown questionId: ${questionId}`,
          validIds: LOOPBRAIN_QUESTIONS_V0.map((q) => q.id),
        },
        { status: 400 }
      );
    }

    const snapshot = await buildOrgSemanticSnapshotV0({ workspaceId });
    const blockerSet = new Set(snapshot.readiness.blockers);
    const intersecting = question.blockingOn.filter((b) => blockerSet.has(b));
    const answerability = intersecting.length === 0 ? "ANSWERABLE" : "BLOCKED";

    const envelopeScaffold = buildEnvelopeScaffold(question, answerability, intersecting);

    const headers = new Headers();
    headers.set("Cache-Control", "no-store");

    return NextResponse.json(
      {
        ok: true,
        snapshot,
        answerability,
        envelopeScaffold,
      },
      { headers }
    );
  } catch (error: unknown) {
    console.error("[GET /api/org/loopbrain/answer-dryrun] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load answer dry-run",
      },
      { status: 500 }
    );
  }
}

function buildEnvelopeScaffold(
  question: LoopbrainQuestionV0,
  answerability: "ANSWERABLE" | "BLOCKED",
  blockers: string[]
) {
  const base = {
    schemaVersion: "v0" as const,
    generatedAt: new Date().toISOString(),
    questionId: question.id,
    answerability,
    confidence: answerability === "ANSWERABLE" ? 0.5 : 0.2,
    blockingFactors: blockers,
    recommendedNextActions: [] as { label: string; deepLink?: string }[],
  };

  if (answerability === "ANSWERABLE") {
    return {
      ...base,
      answer: { summary: "", details: [] },
      supportingEvidence: question.evidencePaths.map((path) => ({ path, value: null })),
    };
  }

  return {
    ...base,
    answer: null,
    supportingEvidence: [],
  };
}
