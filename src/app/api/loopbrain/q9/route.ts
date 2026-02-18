/**
 * Loopbrain Q9 API: "Should we proceed, reassign, delay, or request support?"
 * 
 * GET /api/loopbrain/q9?projectId=...&start=...&end=... (start and end are optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import { answerQ9 } from "@/lib/loopbrain/q9";
import { handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId;
    setWorkspaceContext(workspaceId);

    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const start = searchParams.get("start"); // optional ISO
    const end = searchParams.get("end"); // optional ISO (recommended)

    if (!projectId) {
      return NextResponse.json(
        {
          questionId: "Q9",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "MISSING_PROJECT_ID", message: "projectId is required" }],
          projectId: "",
          decision: {
            action: "insufficient_data" as const,
            explanation: ["projectId is required"],
          },
          options: [],
          evidence: {
            ownership: "missing",
            decisionAuthority: "missing",
            availability: "unknown",
            allocations: "unknown",
          },
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
          questionId: "Q9",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "PROJECT_NOT_FOUND", message: "Project not found" }],
          projectId,
          decision: {
            action: "insufficient_data" as const,
            explanation: ["Project not found"],
          },
          options: [],
          evidence: {
            ownership: "missing",
            decisionAuthority: "missing",
            availability: "unknown",
            allocations: "unknown",
          },
        },
        { status: 404 }
      );
    }

    // Fetch people for name resolution
    const users = await prisma.user.findMany({
      where: {
        orgPositions: {
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

    // Fetch roles with responsibilities
    const orgId = project.orgId || workspaceId;
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

    // Parse timeframe if provided
    const timeframe =
      end
        ? {
            start: start ? new Date(start) : new Date(),
            end: new Date(end),
          }
        : undefined;

    const resp = await answerQ9({
      projectId,
      workspaceId,
      project,
      peopleById,
      rolesByName,
      timeframe,
    });

    return NextResponse.json(resp);
  } catch (error) {
    return handleApiError(error, request)
  }
}

