import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors"

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    const projects = await prisma.project.findMany({
      where: { workspaceId },
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
        allocations: {
          select: {
            id: true,
            personId: true,
            fraction: true,
            startDate: true,
            endDate: true,
            person: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Resolve person names if person IDs are set
    const projectsWithNames = await Promise.all(
      projects.map(async (project) => {
        const accountability = project.accountability;
        if (!accountability) {
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            workspaceId: project.workspaceId,
            accountability: null,
          };
        }

        // Resolve owner person name
        let ownerPerson: string | undefined;
        let ownerPersonId: string | undefined;
        if (accountability.ownerPersonId) {
          ownerPersonId = accountability.ownerPersonId;
          const owner = await prisma.user.findUnique({
            where: { id: accountability.ownerPersonId },
            select: { name: true },
          });
          ownerPerson = owner?.name || undefined;
        }

        // Resolve decision person name
        let decisionPerson: string | undefined;
        let decisionPersonId: string | undefined;
        if (accountability.decisionPersonId) {
          decisionPersonId = accountability.decisionPersonId;
          const decision = await prisma.user.findUnique({
            where: { id: accountability.decisionPersonId },
            select: { name: true },
          });
          decisionPerson = decision?.name || undefined;
        }

        // Resolve escalation person name
        let escalationPerson: string | undefined;
        let escalationPersonId: string | undefined;
        if (accountability.escalationPersonId) {
          escalationPersonId = accountability.escalationPersonId;
          const escalation = await prisma.user.findUnique({
            where: { id: accountability.escalationPersonId },
            select: { name: true },
          });
          escalationPerson = escalation?.name || undefined;
        }

        // Resolve backup owner person name
        let backupOwnerPerson: string | undefined;
        let backupOwnerPersonId: string | undefined;
        if (accountability.backupOwnerPersonId) {
          backupOwnerPersonId = accountability.backupOwnerPersonId;
          const backupOwner = await prisma.user.findUnique({
            where: { id: accountability.backupOwnerPersonId },
            select: { name: true },
          });
          backupOwnerPerson = backupOwner?.name || undefined;
        }

        // Resolve backup decision person name
        let backupDecisionPerson: string | undefined;
        let backupDecisionPersonId: string | undefined;
        if (accountability.backupDecisionPersonId) {
          backupDecisionPersonId = accountability.backupDecisionPersonId;
          const backupDecision = await prisma.user.findUnique({
            where: { id: accountability.backupDecisionPersonId },
            select: { name: true },
          });
          backupDecisionPerson = backupDecision?.name || undefined;
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          workspaceId: project.workspaceId,
          accountability: {
            ownerPersonId,
            ownerPerson,
            ownerRole: accountability.ownerRole || undefined,
            decisionPersonId,
            decisionPerson,
            decisionRole: accountability.decisionRole || undefined,
            escalationPersonId,
            escalationPerson,
            escalationRole: accountability.escalationRole || undefined,
            backupOwnerPersonId,
            backupOwnerPerson,
            backupOwnerRole: accountability.backupOwnerRole || undefined,
            backupDecisionPersonId,
            backupDecisionPerson,
            backupDecisionRole: accountability.backupDecisionRole || undefined,
          },
          allocations: project.allocations.map((a) => ({
            id: a.id,
            personId: a.personId,
            personName: a.person.name || "Unnamed",
            fraction: a.fraction,
            startDate: a.startDate.toISOString(),
            endDate: a.endDate?.toISOString() ?? null,
          })),
        };
      })
    );

    return NextResponse.json({
      ok: true,
      projects: projectsWithNames,
    });
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

