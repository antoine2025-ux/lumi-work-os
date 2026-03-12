/**
 * GET /api/org/people/[personId]/role-card
 *
 * Aggregated role card view for a person:
 * - Role card template (attached to their OrgPosition) — incl. roleInOrg, focusArea, managerNotes
 * - Shared JobDescription template (linked via OrgPosition.jobDescriptionId)
 * - Self-declared skills (PersonSkill → Skill)
 * - Current project allocations + open task counts (self / manager / admin only)
 *
 * personId may be a User.id or OrgPosition.id — both are resolved.
 *
 * Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    // Resolve personId: may be OrgPosition.id or User.id
    const position = await prisma.orgPosition.findFirst({
      where: {
        OR: [
          { id: personId, workspaceId, isActive: true },
          { userId: personId, workspaceId, isActive: true },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        team: { select: { id: true, name: true } },
        jobDescription: {
          select: {
            id: true,
            title: true,
            summary: true,
            level: true,
            jobFamily: true,
            responsibilities: true,
            requiredSkills: true,
            preferredSkills: true,
            keyMetrics: true,
          },
        },
        roleCard: {
          include: {
            skillRefs: {
              include: {
                skill: { select: { id: true, name: true, category: true } },
              },
            },
          },
        },
      },
    });

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const resolvedUserId = position.userId;

    // ── currentWork visibility gate ─────────────────────────────────────────
    const isSelf = userId === resolvedUserId;
    const isAdmin = auth.user.roles.some((r) => ["ADMIN", "OWNER"].includes(r));

    let canSeeCurrentWork = isSelf || isAdmin;

    if (!canSeeCurrentWork) {
      // Check PersonManagerLink (canonical)
      const managerLink = await prisma.personManagerLink.findFirst({
        where: {
          workspaceId,
          personId: resolvedUserId,
          managerId: userId,
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
      });

      if (managerLink) {
        canSeeCurrentWork = true;
      } else if (position.parentId) {
        // Fallback: OrgPosition.parentId hierarchy — position already loaded
        const parentPosition = await prisma.orgPosition.findFirst({
          where: { id: position.parentId, userId, workspaceId },
        });
        if (parentPosition) canSeeCurrentWork = true;
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    // Fetch skills always; fetch work data only when permitted
    const [skills, allocations, taskGroups] = await Promise.all([
      prisma.personSkill.findMany({
        where: { workspaceId, personId: resolvedUserId },
        include: {
          skill: { select: { id: true, name: true, category: true } },
        },
        orderBy: [{ proficiency: "desc" }, { skill: { name: "asc" } }],
      }),
      canSeeCurrentWork
        ? prisma.projectAllocation.findMany({
            where: {
              workspaceId,
              personId: resolvedUserId,
              OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
            },
            include: {
              project: { select: { id: true, name: true } },
            },
            take: 10,
            orderBy: { startDate: "desc" },
          })
        : Promise.resolve([]),
      canSeeCurrentWork
        ? prisma.task.groupBy({
            by: ["status"],
            where: {
              workspaceId,
              assigneeId: resolvedUserId,
              status: { in: ["TODO", "IN_PROGRESS"] },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const taskCounts: Record<string, number> = {};
    for (const g of taskGroups) {
      taskCounts[g.status] = g._count._all;
    }

    return NextResponse.json({
      ok: true,
      person: {
        userId: position.userId,
        name: position.user?.name ?? null,
        email: position.user?.email ?? null,
        image: position.user?.image ?? null,
        positionId: position.id,
        positionTitle: position.title ?? null,
        team: position.team ?? null,
        // Position-level role definition (legacy fields still populated on OrgPosition)
        responsibilities: position.responsibilities,
        requiredSkills: position.requiredSkills,
        preferredSkills: position.preferredSkills,
      },
      jobDescription: position.jobDescription ?? null,
      roleCard: position.roleCard
        ? {
            id: position.roleCard.id,
            roleName: position.roleCard.roleName,
            jobFamily: position.roleCard.jobFamily,
            level: position.roleCard.level,
            roleDescription: position.roleCard.roleDescription,
            responsibilities: position.roleCard.responsibilities,
            requiredSkills: position.roleCard.requiredSkills,
            preferredSkills: position.roleCard.preferredSkills,
            keyMetrics: position.roleCard.keyMetrics,
            roleInOrg: position.roleCard.roleInOrg,
            focusArea: position.roleCard.focusArea,
            managerNotes: position.roleCard.managerNotes,
            skillRefs: position.roleCard.skillRefs.map((sr) => ({
              id: sr.id,
              type: sr.type,
              minProficiency: sr.minProficiency,
              skill: sr.skill,
            })),
          }
        : null,
      skills: skills.map((ps) => ({
        id: ps.id,
        skillId: ps.skillId,
        name: ps.skill.name,
        category: ps.skill.category,
        proficiency: ps.proficiency,
        source: ps.source,
        verifiedAt: ps.verifiedAt?.toISOString() ?? null,
      })),
      currentWork: canSeeCurrentWork
        ? {
            projects: allocations.map((a) => ({
              allocationId: a.id,
              projectId: a.project.id,
              projectName: a.project.name,
              fraction: a.fraction,
              startDate: a.startDate.toISOString(),
              endDate: a.endDate?.toISOString() ?? null,
            })),
            taskCounts: {
              todo: taskCounts["TODO"] ?? 0,
              inProgress: taskCounts["IN_PROGRESS"] ?? 0,
            },
          }
        : null,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
