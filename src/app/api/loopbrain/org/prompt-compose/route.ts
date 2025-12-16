import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";

type PromptComposeRequest = {
  question?: string;
  metadata?: any;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PromptComposeRequest | null;

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

    // Build the Org preamble using the existing helper
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

    return NextResponse.json({
      ok: true,
      orgPreamble,
      userQuestion: question,
      combinedPrompt,
      metadata: body?.metadata ?? null,
    });
  } catch (error) {
    console.error("Loopbrain Org prompt-compose error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to compose Org prompt",
      },
      { status: 500 }
    );
  }
}

