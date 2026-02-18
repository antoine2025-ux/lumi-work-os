import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const body = (await req.json()) as {
      personId?: string;
      suggestionRunId?: string;
      confidence?: number;
      accepted?: boolean;
      partiallyApplied?: boolean;
      feedback?: string;
    };

    await prisma.loopBrainFeedback.create({
      data: {
        orgId: workspaceId,
        scope: "people_issues",
        personId: body.personId,
        suggestionRunId: body.suggestionRunId,
        confidence: body.confidence,
        accepted: body.accepted,
        partiallyApplied: body.partiallyApplied,
        feedback: body.feedback,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, req);
  }
}
