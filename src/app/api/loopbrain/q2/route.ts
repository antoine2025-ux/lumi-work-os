/**
 * Loopbrain Q2 API: "Who decides this?"
 * 
 * GET /api/loopbrain/q2?projectId=...
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import { answerQ2 } from "@/lib/loopbrain/q2";

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
          questionId: "Q2",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "MISSING_PROJECT_ID", message: "projectId is required" }],
          decision: { type: "unset" },
          escalation: { type: "unset" },
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
          questionId: "Q2",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "PROJECT_NOT_FOUND", message: "Project not found" }],
          decision: { type: "unset" },
          escalation: { type: "unset" },
        },
        { status: 404 }
      );
    }

    // Fetch people for name resolution
    const orgId = project.orgId || workspaceId;
    const users = await prisma.user.findMany({
      where: {
        positions: {
          some: {
            workspaceId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const peopleById = Object.fromEntries(
      users.map((u) => [u.id, { name: u.name || "Unnamed" }])
    );

    const resp = await answerQ2({ project, peopleById });
    return NextResponse.json(resp);
  } catch (error: any) {
    console.error("Q2 reasoning error:", error);

    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json(
        {
          questionId: "Q2",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "UNAUTHORIZED", message: "Unauthorized" }],
          decision: { type: "unset" },
          escalation: { type: "unset" },
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        questionId: "Q2",
        assumptions: [],
        constraints: [],
        risks: [],
        confidence: "low",
        errors: [
          {
            code: "INTERNAL_ERROR",
            message: `Failed to answer Q2: ${error.message}`,
          },
        ],
        decision: { type: "unset" },
        escalation: { type: "unset" },
      },
      { status: 500 }
    );
  }
}

