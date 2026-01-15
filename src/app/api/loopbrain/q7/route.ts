/**
 * Loopbrain Q7 API: "Is responsibility aligned with role and responsibilities?"
 * 
 * GET /api/loopbrain/q7?projectId=...
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import { answerQ7 } from "@/lib/loopbrain/q7";

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
          questionId: "Q7",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "MISSING_PROJECT_ID", message: "projectId is required" }],
          projectId: "",
          notes: [],
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
          questionId: "Q7",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "PROJECT_NOT_FOUND", message: "Project not found" }],
          projectId,
          notes: [],
        },
        { status: 404 }
      );
    }

    const orgId = project.orgId || workspaceId;

    // Fetch roles with responsibilities
    const roles = await prisma.role.findMany({
      where: { orgId },
      include: {
        responsibilities: {
          select: {
            scope: true,
            target: true,
          },
        },
      },
    });

    const rolesByName = Object.fromEntries(
      roles.map((r) => [
        r.name,
        {
          name: r.name,
          responsibilities: r.responsibilities.map((res) => ({
            scope: res.scope,
            target: res.target,
          })),
        },
      ])
    );

    const resp = await answerQ7({ projectId, project, rolesByName });
    return NextResponse.json(resp);
  } catch (error: any) {
    console.error("Q7 reasoning error:", error);

    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json(
        {
          questionId: "Q7",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "UNAUTHORIZED", message: "Unauthorized" }],
          projectId: "",
          notes: [],
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        questionId: "Q7",
        assumptions: [],
        constraints: [],
        risks: [],
        confidence: "low",
        errors: [
          {
            code: "INTERNAL_ERROR",
            message: `Failed to answer Q7: ${error.message}`,
          },
        ],
        projectId: "",
        notes: [],
      },
      { status: 500 }
    );
  }
}

