/**
 * GET /api/org/people/[personId]/role-card
 *
 * Aggregated role card view for a person:
 * - Role card template (attached to their OrgPosition)
 * - Self-declared skills (PersonSkill → Skill)
 * - Current project allocations (active)
 * - Open task counts by status
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

    // Fetch skills and work in parallel
    const [skills, allocations, taskGroups] = await Promise.all([
      prisma.personSkill.findMany({
        where: { workspaceId, personId: resolvedUserId },
        include: {
          skill: { select: { id: true, name: true, category: true } },
        },
        orderBy: [{ proficiency: "desc" }, { skill: { name: "asc" } }],
      }),
      prisma.projectAllocation.findMany({
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
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: {
          workspaceId,
          assigneeId: resolvedUserId,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        _count: { _all: true },
      }),
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
      currentWork: {
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
      },
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
