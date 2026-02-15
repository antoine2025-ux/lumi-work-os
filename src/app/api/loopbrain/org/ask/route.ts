import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildOrgQuestionPrompt } from "@/lib/loopbrain/orgQuestionPrompt";
import { runOrgQuestionLLM } from "@/lib/loopbrain/orgLlmClient";
import {
  logOrgLoopbrainQuery,
  createAnswerPreview,
} from "@/lib/loopbrain/orgQueryLogger";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { assertAccess } from "@/lib/auth/assertAccess";
import { handleApiError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

type OrgAskRequestBody = {
  question: string;
  limit?: number;
};

/**
 * POST /api/loopbrain/org/ask
 *
 * Org-aware Loopbrain entrypoint.
 * - Fetches Org ContextItems from the context store.
 * - Builds an Org-focused prompt.
 * - Calls LLM via orgLlmClient to generate an answer.
 * - Returns answer + prompt + metadata.
 *
 * Auth: getUnifiedAuth → assertAccess (workspace MEMBER) → use auth.workspaceId.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.workspaceId) {
      return NextResponse.json(
        { ok: false, error: "No workspace in session." },
        { status: 400 }
      );
    }
    setWorkspaceContext(auth.workspaceId);
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });
    const workspaceId = auth.workspaceId;

    const body = (await req.json()) as OrgAskRequestBody;
    const question = (body.question ?? "").trim();
    const limit = body.limit && body.limit > 0 ? body.limit : 100;

    if (!question) {
      return NextResponse.json(
        { ok: false, error: "Missing 'question' in request body." },
        { status: 400 }
      );
    }

    // Pull Org-related ContextItems from the context store
    const items = await prisma.contextItem.findMany({
      where: {
        workspaceId,
        type: {
          in: ["department", "team", "role", "person"],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    });

    // Check if we have any org context
    if (items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No org context available",
          detail:
            "Your org data hasn't been synced to Loopbrain yet. Please run the sync process first.",
          syncUrl: "/api/loopbrain/org/context/sync",
          statusUrl: "/api/loopbrain/org/context/status",
          contextItemsCount: 0,
        },
        { status: 400 }
      );
    }

    const prompt = buildOrgQuestionPrompt({
      question,
      workspaceId,
      items,
    });

    // Call LLM for a real answer
    const llmResult = await runOrgQuestionLLM({
      system: prompt.system,
      user: prompt.user,
    });

    const answer = llmResult.answer ?? "";

    const currentUserId = auth.user.userId ?? null;

    // Fire-and-forget logging (no await necessary,
    // but we keep await to preserve ordering in dev).
    await logOrgLoopbrainQuery({
      workspaceId,
      userId: currentUserId,
      question,
      answerPreview: createAnswerPreview(answer),
      contextItemsCount: items.length,
      metadata: {
        // Lightweight metadata; expand later if needed.
        typesIncluded: ["department", "team", "role", "person"],
        limit,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        workspaceId,
        question,
        contextItemsCount: items.length,
        answer,
        prompt,
        meta: {
          typesIncluded: ["department", "team", "role", "person"],
          limit,
          model: llmResult.model,
          usage: llmResult.usage,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, req)
  }
}

