/**
 * Loopbrain Q6 API: "Who can cover this if the primary owner is unavailable?"
 * 
 * GET /api/loopbrain/q6?projectId=...
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import { answerQ6 } from "@/lib/loopbrain/q6";
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

    if (!projectId) {
      return NextResponse.json(
        {
          questionId: "Q6",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "MISSING_PROJECT_ID", message: "projectId is required" }],
          projectId: "",
          primaryOwner: { type: "unset" },
          backups: { backupOwner: { type: "unset" } },
          candidates: [],
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
          questionId: "Q6",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "PROJECT_NOT_FOUND", message: "Project not found" }],
          projectId,
          primaryOwner: { type: "unset" },
          backups: { backupOwner: { type: "unset" } },
          candidates: [],
        },
        { status: 404 }
      );
    }

    const orgId = project.orgId || workspaceId;

    // Fetch people with their positions (team and role info)
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const peopleById: Record<
      string,
      {
        name: string;
        teamId?: string | null;
        teamName?: string | null;
        roleName?: string | null;
      }
    > = {};

    for (const pos of positions) {
      if (!pos.user) continue;
      if (peopleById[pos.user.id]) continue; // Use first position

      peopleById[pos.user.id] = {
        name: pos.user.name || "Unnamed",
        teamId: pos.team?.id || null,
        teamName: pos.team?.name || null,
        roleName: pos.title || null,
      };
    }

    // Fetch allocations
    const allocations = await prisma.projectAllocation.findMany({
      where: { orgId },
      select: {
        personId: true,
        projectId: true,
        fraction: true,
        startDate: true,
        endDate: true,
      },
    });

    const resp = await answerQ6({
      projectId,
      project,
      peopleById,
      allocations: allocations.map((a) => ({
        personId: a.personId,
        projectId: a.projectId,
        fraction: a.fraction,
        startDate: a.startDate,
        endDate: a.endDate,
      })),
    });

    return NextResponse.json(resp);
  } catch (error) {
    return handleApiError(error, request)
  }
}

