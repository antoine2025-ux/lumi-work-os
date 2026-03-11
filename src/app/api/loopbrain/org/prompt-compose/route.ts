import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { LoopbrainOrgPromptComposeSchema } from "@/lib/validations/loopbrain";

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

    const body = LoopbrainOrgPromptComposeSchema.parse(await request.json());
    const question = body.question;

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
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

