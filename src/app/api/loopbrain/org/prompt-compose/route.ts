import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

type PromptComposeRequest = {
  question?: string;
  metadata?: any;
};

export async function POST(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

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
    return handleApiError(error, request);
  }
}

