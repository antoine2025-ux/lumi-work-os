/**
 * Loopbrain Q8 API: "Is responsibility clear or fragmented?"
 * 
 * GET /api/loopbrain/q8?projectId=...
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import { answerQ8 } from "@/lib/loopbrain/q8";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        {
          questionId: "Q8",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "MISSING_PROJECT_ID", message: "projectId is required" }],
          projectId: "",
          status: "unknown" as const,
          missing: [],
        },
        { status: 400 }
      );
    }

    // Fetch project with accountability
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ orgId: workspaceId }, { workspaceId }],
      },
      include: {
        accountability: {
          select: {
            ownerPersonId: true,
            ownerRole: true,
            decisionPersonId: true,
            decisionRole: true,
            escalationPersonId: true,
            escalationRole: true,
            backupOwnerPersonId: true,
            backupOwnerRole: true,
            backupDecisionPersonId: true,
            backupDecisionRole: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          questionId: "Q8",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "PROJECT_NOT_FOUND", message: "Project not found" }],
          projectId,
          status: "unknown" as const,
          missing: [],
        },
        { status: 404 }
      );
    }

    const resp = await answerQ8({ projectId, project });
    return NextResponse.json(resp);
  } catch (error: any) {
    console.error("Q8 reasoning error:", error);

    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json(
        {
          questionId: "Q8",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "UNAUTHORIZED", message: "Unauthorized" }],
          projectId: "",
          status: "unknown" as const,
          missing: [],
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        questionId: "Q8",
        assumptions: [],
        constraints: [],
        risks: [],
        confidence: "low",
        errors: [
          {
            code: "INTERNAL_ERROR",
            message: `Failed to answer Q8: ${error.message}`,
          },
        ],
        projectId: "",
        status: "unknown" as const,
        missing: [],
      },
      { status: 500 }
    );
  }
}

