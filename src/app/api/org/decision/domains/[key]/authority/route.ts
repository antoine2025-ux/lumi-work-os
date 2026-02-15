/**
 * PUT /api/org/decision/domains/[key]/authority
 * 
 * Set or update decision authority for a domain.
 * 
 * Request body:
 * {
 *   primary: { personId?: string, roleType?: string },
 *   escalation: Array<{ personId?: string, roleType?: string }>
 * }
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
import { getDecisionResponseMeta } from "@/lib/org/decision/types";

type RouteParams = { params: Promise<{ key: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Fetch domain
    const domain = await prisma.decisionDomain.findFirst({
      where: {
        workspaceId,
        key: key.toUpperCase(),
        isArchived: false,
      },
      include: {
        authority: true,
      },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Step 5: Parse and validate request body
    const body = await request.json();

    // Validate primary
    if (!body.primary) {
      return NextResponse.json({ error: "primary is required" }, { status: 400 });
    }

    const { primary, escalation } = body;

    // Primary must have either personId or roleType, not both
    if (primary.personId && primary.roleType) {
      return NextResponse.json(
        { error: "primary must have either personId or roleType, not both" },
        { status: 400 }
      );
    }

    if (!primary.personId && !primary.roleType) {
      return NextResponse.json(
        { error: "primary must have personId or roleType" },
        { status: 400 }
      );
    }

    // Validate primary personId exists if provided
    if (primary.personId) {
      const user = await prisma.user.findUnique({
        where: { id: primary.personId },
      });
      if (!user) {
        return NextResponse.json(
          { error: `Primary person not found: ${primary.personId}` },
          { status: 400 }
        );
      }
    }

    // Validate escalation steps
    const escalationSteps: Array<{ personId?: string; roleType?: string }> = [];
    if (escalation && Array.isArray(escalation)) {
      for (let i = 0; i < escalation.length; i++) {
        const step = escalation[i];

        if (step.personId && step.roleType) {
          return NextResponse.json(
            { error: `Escalation step ${i} must have either personId or roleType, not both` },
            { status: 400 }
          );
        }

        if (!step.personId && !step.roleType) {
          return NextResponse.json(
            { error: `Escalation step ${i} must have personId or roleType` },
            { status: 400 }
          );
        }

        // Validate personId exists if provided
        if (step.personId) {
          const user = await prisma.user.findUnique({
            where: { id: step.personId },
          });
          if (!user) {
            return NextResponse.json(
              { error: `Escalation step ${i} person not found: ${step.personId}` },
              { status: 400 }
            );
          }
        }

        escalationSteps.push({
          personId: step.personId ?? undefined,
          roleType: step.roleType ?? undefined,
        });
      }
    }

    // Step 6: Upsert authority in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing authority and steps if present
      if (domain.authority) {
        await tx.decisionEscalationStep.deleteMany({
          where: { authorityId: domain.authority.id },
        });
        await tx.decisionAuthority.delete({
          where: { id: domain.authority.id },
        });
      }

      // Create new authority
      const authority = await tx.decisionAuthority.create({
        data: {
          domainId: domain.id,
          primaryPersonId: primary.personId ?? null,
          primaryRoleType: primary.roleType ?? null,
          workspaceId: auth.workspaceId,
        },
      });

      // Create escalation steps
      if (escalationSteps.length > 0) {
        await tx.decisionEscalationStep.createMany({
          data: escalationSteps.map((step, index) => ({
            authorityId: authority.id,
            stepOrder: index,
            personId: step.personId ?? null,
            roleType: step.roleType ?? null,
            workspaceId: auth.workspaceId,
          })),
        });
      }
    });

    // Step 7: Fetch updated domain
    const updatedDomain = await prisma.decisionDomain.findUnique({
      where: { id: domain.id },
      include: {
        authority: {
          include: {
            escalationSteps: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
    });

    // Resolve person names
    let primaryPersonName: string | null = null;
    if (updatedDomain?.authority?.primaryPersonId) {
      const user = await prisma.user.findUnique({
        where: { id: updatedDomain.authority.primaryPersonId },
        select: { name: true, email: true },
      });
      primaryPersonName = user?.name ?? user?.email ?? null;
    }

    const escalationWithNames = await Promise.all(
      (updatedDomain?.authority?.escalationSteps ?? []).map(async (step) => {
        let personName: string | null = null;
        if (step.personId) {
          const user = await prisma.user.findUnique({
            where: { id: step.personId },
            select: { name: true, email: true },
          });
          personName = user?.name ?? user?.email ?? null;
        }
        return {
          stepOrder: step.stepOrder,
          personId: step.personId,
          personName,
          roleType: step.roleType,
          configuredAs: step.personId ? "PERSON" : "ROLE",
        };
      })
    );

    return NextResponse.json({
      ok: true,
      domain: {
        id: updatedDomain!.id,
        key: updatedDomain!.key,
        name: updatedDomain!.name,
        authority: {
          primaryPersonId: updatedDomain!.authority!.primaryPersonId,
          primaryPersonName,
          primaryRoleType: updatedDomain!.authority!.primaryRoleType,
          primaryConfiguredAs: updatedDomain!.authority!.primaryPersonId ? "PERSON" : "ROLE",
          escalationSteps: escalationWithNames,
        },
      },
      responseMeta: getDecisionResponseMeta(),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
