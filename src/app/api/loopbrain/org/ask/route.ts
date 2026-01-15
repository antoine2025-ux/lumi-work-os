import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { buildOrgQuestionPrompt } from "@/lib/loopbrain/orgQuestionPrompt";
import { runOrgQuestionLLM } from "@/lib/loopbrain/orgLlmClient";
import {
  logOrgLoopbrainQuery,
  createAnswerPreview,
} from "@/lib/loopbrain/orgQueryLogger";
import { getUnifiedAuth } from "@/lib/unified-auth";

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
 */
export async function POST(req: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId();

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

    // Try to get current user ID (non-fatal if unavailable)
    let currentUserId: string | null = null;
    try {
      const auth = await getUnifiedAuth(req);
      currentUserId = auth.user.userId ?? null;
    } catch (authError) {
      console.warn(
        "[loopbrain/org/ask] Could not resolve current user for logging",
        authError
      );
    }

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
    console.error("[loopbrain/org/ask] Failed to process Org question", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process Org-aware Loopbrain question.",
      },
      { status: 500 }
    );
  }
}

