// src/app/api/loopbrain/org/qa/run/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { evaluateOrgQaQuestionsForWorkspace } from "@/lib/org/qa/evaluator";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

function isDevToolsEnabled() {
  const isProd = process.env.NODE_ENV === "production";
  const allowDev = process.env.ALLOW_DEV_LOGIN === "true";
  return !isProd || allowDev;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isDevToolsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id } = await context.params;

  try {
    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspace" },
        { status: 400 }
      );
    }

    // Evaluate all questions, then pick the one we just ran
    const questions = await evaluateOrgQaQuestionsForWorkspace(workspaceId);
    const question = questions.find((q) => q.id === id) ?? null;

    if (!question) {
      return NextResponse.json(
        {
          ok: false,
          error: "Question not found",
        },
        { status: 404 },
      );
    }

    const acceptHeader = req.headers.get("accept") ?? "";

    if (acceptHeader.includes("application/json")) {
      return NextResponse.json(
        {
          ok: true,
          question,
        },
        { status: 200 },
      );
    }

    // Default behavior: redirect back to the Org QA status page
    return NextResponse.redirect(
      new URL("/org/dev/loopbrain-status", req.nextUrl),
      303,
    );
  } catch (error) {
    console.error("Org QA run route error:", error);

    const acceptHeader = req.headers.get("accept") ?? "";

    if (acceptHeader.includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to run Org QA question",
        },
        { status: 500 },
      );
    }

    // Redirect even on error for form submissions
    return NextResponse.redirect(
      new URL("/org/dev/loopbrain-status", req.nextUrl),
      303,
    );
  }
}
