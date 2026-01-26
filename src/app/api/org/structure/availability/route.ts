/**
 * GET /api/org/structure/availability
 * Returns availability rollups for all departments and teams.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import {
  deriveTeamAvailability,
  deriveDepartmentAvailability,
  type TeamMemberInput,
} from "@/lib/org/rollups/deriveTeamAvailability";
import type { AvailabilityWindow, EmploymentStatus } from "@/lib/org/deriveAvailability";

export async function GET(request: NextRequest) {
  try {
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
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Fetch all teams with their members and availability data
    const teams = await prisma.orgTeam.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
      },
    });

    // Step 5: Fetch all positions to map team memberships
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      select: {
        userId: true,
        teamId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Step 6: Fetch workspace members for employment status
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      select: {
        userId: true,
        employmentStatus: true,
      },
    });

    const employmentMap = new Map(
      members.map((m) => [m.userId, m.employmentStatus as EmploymentStatus])
    );

    // Step 7: Fetch all availability windows
    const allWindows = await prisma.personAvailability.findMany({
      where: {
        workspaceId,
      },
      select: {
        personId: true,
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
        reason: true,
        expectedReturnDate: true,
        note: true,
      },
    });

    // Group windows by personId
    const windowsByPerson = new Map<string, AvailabilityWindow[]>();
    for (const w of allWindows) {
      const windows = windowsByPerson.get(w.personId) ?? [];
      windows.push({
        type: w.type === "UNAVAILABLE" ? "unavailable" : "partial",
        startDate: w.startDate,
        endDate: w.endDate ?? undefined,
        fraction: w.fraction ?? undefined,
        reason: w.reason as AvailabilityWindow["reason"],
        expectedReturnDate: w.expectedReturnDate ?? undefined,
        note: w.note ?? undefined,
      });
      windowsByPerson.set(w.personId, windows);
    }

    // Step 8: Build team member lists
    const teamMembersMap = new Map<string, TeamMemberInput[]>();
    for (const pos of positions) {
      if (!pos.teamId || !pos.userId) continue;

      const members = teamMembersMap.get(pos.teamId) ?? [];
      members.push({
        personId: pos.userId,
        personName: pos.user?.name ?? undefined,
        employmentStatus: employmentMap.get(pos.userId),
        windows: windowsByPerson.get(pos.userId) ?? [],
      });
      teamMembersMap.set(pos.teamId, members);
    }

    // Step 9: Derive team availability
    const teamRollups: Record<string, {
      availableCount: number;
      partialCount: number;
      unavailableCount: number;
      totalMembers: number;
    }> = {};

    for (const team of teams) {
      const teamMembers = teamMembersMap.get(team.id) ?? [];
      const summary = deriveTeamAvailability(team.id, teamMembers, {
        teamName: team.name,
      });

      teamRollups[team.id] = {
        availableCount: summary.availableCount,
        partialCount: summary.partialCount,
        unavailableCount: summary.unavailableCount,
        totalMembers: summary.totalMembers,
      };
    }

    // Step 10: Aggregate to departments
    const departments = await prisma.orgDepartment.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const departmentRollups: Record<string, {
      availableCount: number;
      partialCount: number;
      unavailableCount: number;
      totalMembers: number;
    }> = {};

    for (const dept of departments) {
      const deptTeams = teams.filter((t) => t.departmentId === dept.id);
      let availableCount = 0;
      let partialCount = 0;
      let unavailableCount = 0;
      let totalMembers = 0;

      for (const team of deptTeams) {
        const rollup = teamRollups[team.id];
        if (rollup) {
          availableCount += rollup.availableCount;
          partialCount += rollup.partialCount;
          unavailableCount += rollup.unavailableCount;
          totalMembers += rollup.totalMembers;
        }
      }

      departmentRollups[dept.id] = {
        availableCount,
        partialCount,
        unavailableCount,
        totalMembers,
      };
    }

    return NextResponse.json({
      ok: true,
      teams: teamRollups,
      departments: departmentRollups,
      computedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/structure/availability] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

