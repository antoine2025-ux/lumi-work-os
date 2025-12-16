import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { logOrgQna } from "@/lib/org-qna-log";

type OrgQnaRequest = {
  question?: string;
  metadata?: any;
};

export async function POST(request: NextRequest) {
  try {
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

    // 2) Stubbed answer – placeholder for now
    const stubAnswer =
      "This is a placeholder answer from the Org Q&A stub. " +
      "In production, this endpoint will call Loopbrain/OpenAI using the combined Org prompt.";

    // 3) Log the Q&A request (best effort, doesn't block response)
    try {
      const workspaceId = await getCurrentWorkspaceId(request);
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
      answer: stubAnswer,
      question,
      orgPreamble,
      combinedPrompt,
      metadata: body?.metadata ?? null,
      debug: {
        source: "org-qna-stub",
      },
    });
  } catch (error) {
    console.error("Loopbrain Org Q&A stub error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to handle Org Q&A request",
      },
      { status: 500 }
    );
  }
}

