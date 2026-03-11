import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateDepartmentBody = {
  departmentId: string | null;
};

/**
 * PATCH /api/org/teams/[id]/department
 * Update a team's department assignment.
 * Setting departmentId to null unassigns the team.
 */
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(req);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated.",
          },
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    const { id } = await params;
    const body = (await req.json()) as UpdateDepartmentBody;

    if (!prisma) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Database connection unavailable.",
          },
        },
        { status: 500 }
      );
    }

    // Verify team exists and belongs to this org
    const team = await prisma.orgTeam.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!team) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "TEAM_NOT_FOUND",
            message: "Team not found or does not belong to this organization.",
          },
        },
        { status: 404 }
      );
    }

    // If departmentId is provided, verify it exists and belongs to this org
    if (body.departmentId !== null && body.departmentId !== undefined) {
      const department = await prisma.orgDepartment.findFirst({
        where: {
          id: body.departmentId,
          workspaceId,
        },
      });

      if (!department) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_DEPARTMENT",
              message: "Department not found or does not belong to this organization.",
            },
          },
          { status: 400 }
        );
      }

      // Check for duplicate team name in the target department
      const existingTeam = await prisma.orgTeam.findFirst({
        where: {
          workspaceId,
          departmentId: body.departmentId,
          name: team.name,
          id: { not: id }, // Exclude current team
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (existingTeam) {
        // Get department name for better error message
        const departmentName = existingTeam.department?.name || "the target department";
        
        // Find ALL teams with the same name (to show duplicates).
        // Use raw SQL to properly handle NULL ordering (NULLs first).
        // SECURITY: $queryRaw tagged template parameterizes ${} values (no SQL injection).
        const allTeamsWithSameName = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          departmentId: string | null;
          department_name: string | null;
        }>>`
          SELECT 
            t.id,
            t.name,
            t."departmentId",
            d.name as department_name
          FROM org_teams t
          LEFT JOIN org_departments d ON t."departmentId" = d.id
          WHERE t."workspaceId" = ${workspaceId}
            AND t.name = ${team.name}
            AND t."isActive" = true
          ORDER BY 
            t."departmentId" NULLS FIRST,
            d.name ASC NULLS FIRST,
            t.name ASC
        `;
        
        // Map raw SQL results to expected format
        const teamsWithSameName = allTeamsWithSameName.map(t => ({
          id: t.id,
          name: t.name,
          departmentId: t.departmentId,
          departmentName: t.department_name || null,
          isUnassigned: t.departmentId === null,
          isCurrentTeam: t.id === id,
          isExistingTeam: t.id === existingTeam.id,
        }));
        
        // Check if current team is unassigned to provide more specific guidance
        const currentTeamIsUnassigned = team.departmentId === null;
        const duplicateCount = teamsWithSameName.length;
        
        const guidanceMessage = duplicateCount > 1
          ? ` There are ${duplicateCount} teams named "${team.name}" in your organization. One is already in ${departmentName}. Consider renaming the unassigned team or removing the duplicate.`
          : currentTeamIsUnassigned
          ? ` There is already a team named "${team.name}" in ${departmentName}. You have two separate teams with this name. You can rename the unassigned team or delete the duplicate before assigning.`
          : ` There is already a team named "${team.name}" in ${departmentName}. Consider renaming one of the teams or removing the duplicate.`;
        
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "TEAM_EXISTS",
              message: `A team named "${team.name}" already exists in ${departmentName}.${guidanceMessage}`,
              details: {
                existingTeamId: existingTeam.id,
                existingTeamName: existingTeam.name,
                existingTeamDepartmentId: existingTeam.departmentId,
                existingTeamDepartmentName: departmentName,
                targetDepartmentId: body.departmentId,
                targetDepartmentName: departmentName,
                currentTeamId: id,
                currentTeamName: team.name,
                currentTeamDepartmentId: team.departmentId,
                duplicateCount,
                allTeamsWithSameName: teamsWithSameName,
                isDuplicate: true,
              },
            },
          },
          { status: 409 }
        );
      }
    }

    // Get previous departmentId for audit logging
    const previousDepartmentId = team.departmentId;

    // Update team department (can be null to unassign)
    const updatedTeam = await prisma.orgTeam.update({
      where: { id },
      data: {
        departmentId: body.departmentId ?? null,
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
      },
    });

    // Log audit event (fire-and-forget)
    const changes = computeChanges(
      { departmentId: previousDepartmentId },
      { departmentId: updatedTeam.departmentId },
      ["departmentId"]
    );
    if (changes) {
      logOrgAudit({
        workspaceId,
        entityType: "TEAM",
        entityId: updatedTeam.id,
        entityName: updatedTeam.name,
        action: "UPDATED",
        actorId: userId,
        changes,
      }).catch((e) => console.error("[PATCH /api/org/teams/[id]/department] Audit error:", e));
    }

    return NextResponse.json({
      ok: true,
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        departmentId: updatedTeam.departmentId,
      },
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

