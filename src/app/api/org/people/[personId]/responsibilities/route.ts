/**
 * GET /api/org/people/[personId]/responsibilities
 *
 * Lightweight endpoint returning a person's responsibility data:
 *   - primaryDomains: decision domains where this person is the primary decider
 *   - coverageDomains: domains where this person appears in escalation steps
 *   - responsibilityOverrides: person-level responsibility tag overrides
 *
 * Query budget: at most 3 Prisma queries. Does NOT call resolveDecisionAuthority per domain.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ personId: string }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const { personId } = await ctx.params;

    // ── Query 1: Domains where this person is the primary decider ────
    const primaryAuthorities = await prisma.decisionAuthority.findMany({
      where: { primaryPersonId: personId },
      include: {
        domain: {
          select: {
            id: true,
            key: true,
            name: true,
            workspaceId: true,
            isArchived: true,
          },
        },
        escalationSteps: {
          select: { id: true },
        },
      },
    });

    const primaryDomains = primaryAuthorities
      .filter((a) => a.domain.workspaceId === workspaceId && !a.domain.isArchived)
      .map((a) => ({
        domainKey: a.domain.key,
        domainName: a.domain.name,
        hasCoverage: a.escalationSteps.length > 0,
      }));

    // ── Query 2: Domains where this person appears in escalation steps ──
    const escalationSteps = await prisma.decisionEscalationStep.findMany({
      where: { personId },
      include: {
        authority: {
          include: {
            domain: {
              select: {
                key: true,
                name: true,
                workspaceId: true,
                isArchived: true,
              },
            },
          },
        },
      },
    });

    const coverageDomains = escalationSteps
      .filter(
        (s) =>
          s.authority.domain.workspaceId === workspaceId &&
          !s.authority.domain.isArchived
      )
      .map((s) => ({
        domainKey: s.authority.domain.key,
        domainName: s.authority.domain.name,
        stepOrder: s.stepOrder,
      }));

    // ── Query 3: Person responsibility overrides ────────────────────
    const overrides = await prisma.personResponsibilityOverride.findMany({
      where: { workspaceId, personId },
      include: {
        tag: {
          select: { key: true, label: true, isArchived: true },
        },
      },
    });

    const responsibilityOverrides = overrides
      .filter((o) => !o.tag.isArchived)
      .map((o) => ({
        tagKey: o.tag.key,
        tagLabel: o.tag.label,
        reason: o.reason,
      }));

    return NextResponse.json({
      ok: true,
      primaryDomains,
      coverageDomains,
      responsibilityOverrides,
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/people/[personId]/responsibilities] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load responsibilities",
      },
      { status: 500 }
    );
  }
}
