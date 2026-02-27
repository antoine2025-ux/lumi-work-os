import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";
import { logOrgQna } from "@/lib/org-qna-log";
import { generateAIResponse } from "@/lib/ai/providers";
import { LOOPBRAIN_ORG_CONFIG } from "@/lib/loopbrain/config";
import { getRefusalTitleV0, getRefusalSubtitleV0 } from "@/lib/loopbrain/contract/refusalCopy.v0";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

type OrgQnaRequest = {
  question?: string;
  metadata?: any;
};

export async function POST(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
    setWorkspaceContext(workspaceId);

    const body = (await request.json()) as OrgQnaRequest | null;

    const questionRaw = body?.question ?? "";
    const question = String(questionRaw).trim();

    if (!question) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing 'question' in request body",
        },
        { status: 400 }
      );
    }

    // 1) Build the Org preamble (same helper as composer)
    const orgPreamble = await buildOrgSummaryPreambleForCurrentWorkspace(
      {
        maxPerType: 10,
      },
      request
    );

    const combinedPrompt = [
      orgPreamble,
      "",
      "---",
      "",
      "USER QUESTION",
      "-------------",
      question,
    ].join("\n");

    // 2) Call the LLM
    let answer: string;
    try {
      const llmResponse = await generateAIResponse(combinedPrompt, LOOPBRAIN_ORG_CONFIG.model, {
        temperature: 0.2,
        maxTokens: LOOPBRAIN_ORG_CONFIG.maxTokens,
      });
      answer = llmResponse.content;
    } catch (llmError) {
      console.error("Loopbrain Org Q&A LLM error", llmError);
      answer = `${getRefusalTitleV0()} — ${getRefusalSubtitleV0()}`;
    }

    // 3) Log the Q&A request (best effort, doesn't block response)
    try {
      await logOrgQna({
        workspaceId,
        question,
        location: body?.metadata?.location ?? null,
        metadata: body?.metadata ?? null,
      });
    } catch (logError) {
      // Logging failures should not affect the Q&A response
      console.error("Failed to log Org Q&A request", logError);
    }

    // 4) Return Q&A contract
    return NextResponse.json({
      ok: true,
      answer,
      question,
      orgPreamble,
      combinedPrompt,
      metadata: body?.metadata ?? null,
      debug: {
        source: "org-qna-llm",
      },
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

