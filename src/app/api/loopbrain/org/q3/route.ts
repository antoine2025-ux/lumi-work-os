/**
 * Loopbrain Q3 API: "Who should be working on this right now?"
 * 
 * POST /api/loopbrain/org/q3
 * 
 * Request body:
 * {
 *   "projectId": "string (required)",
 *   "workspaceId": "string (optional, inferred from auth)"
 * }
 * 
 * Response: Q3Output
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { answerQ3 } from "@/lib/loopbrain/reasoning/q3";
import { handleApiError } from "@/lib/api-errors"

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId;

    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });
    setWorkspaceContext(workspaceId);

    const body = await request.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "projectId is required and must be a string",
        },
        { status: 400 }
      );
    }

    // Call Q3 reasoning function
    const result = await answerQ3(projectId, workspaceId);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return handleApiError(error, request)
  }
}

