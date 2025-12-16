import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertOrgAccess, OrgAuthError } from "@/lib/orgAuth";
import type { OrgPerson } from "@/types/org";

type PeopleResponse =
  | {
      ok: true;
      data: OrgPerson[];
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<PeopleResponse>> {
  const resolvedParams = await params;
  const orgId = resolvedParams.orgId;

  if (!orgId) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "MISSING_ORG_ID", message: "Organization id is required." },
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const teamId = url.searchParams.get("teamId") || undefined;
  const departmentId = url.searchParams.get("departmentId") || undefined;
  const roleId = url.searchParams.get("roleId") || undefined;

  try {
    await assertOrgAccess(orgId, req);
    if (!prisma) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DATABASE_ERROR", message: "Database connection unavailable." },
        },
        { status: 500 }
      );
    }
    // Get all workspace members first (we need all members to enrich with position data)
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    // Build filter conditions for positions
    const positionFilters: any = {
      workspaceId: orgId,
      isActive: true,
      userId: {
        not: null,
      },
    };

    // Add team filter if provided
    if (teamId) {
      positionFilters.teamId = teamId;
    }

    // Add department filter if provided (via team's department)
    if (departmentId) {
      positionFilters.team = {
        departmentId: departmentId,
      };
    }

    // Add search query filter if provided (for user name/email or role title)
    // Note: roleId is handled client-side as a search, not exact match
    if (q) {
      positionFilters.OR = [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { title: { contains: q, mode: "insensitive" } },
      ];
    }

    // Get positions with users assigned to get team/department info
    const positionsWithUsers = await prisma.orgPosition.findMany({
      where: positionFilters,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Build a map from userId -> position info (primary position)
    const userIdToPosition = new Map<
      string,
      {
        role: string;
        teamId: string | null;
        team: string | null;
        departmentId: string | null;
        department: string | null;
      }
    >();

    for (const pos of positionsWithUsers) {
      if (!pos.user) continue;
      // Use first position we see as primary
      if (userIdToPosition.has(pos.user.id)) continue;

      userIdToPosition.set(pos.user.id, {
        role: pos.title,
        teamId: pos.team?.id ?? null,
        team: pos.team?.name ?? null,
        departmentId: pos.team?.department?.id ?? null,
        department: pos.team?.department?.name ?? null,
      });
    }

    // Combine members with their position info
    const people: OrgPerson[] = members.map((m) => {
      const positionInfo = userIdToPosition.get(m.userId);

      return {
        id: m.userId, // Use userId as the person ID
        name: m.user?.name ?? m.user?.email ?? "Unknown",
        email: m.user?.email ?? "",
        role: positionInfo?.role ?? null,
        teamId: positionInfo?.teamId ?? null,
        team: positionInfo?.team ?? null,
        departmentId: positionInfo?.departmentId ?? null,
        department: positionInfo?.department ?? null,
        location: null, // Location not available in current schema
        joinedAt: m.joinedAt?.toISOString(), // Include join date for sorting
      };
    });

    // Apply client-side filtering for roleId (search-based, not exact match)
    // Team and department filters are already applied server-side via Prisma
    // Search query (q) is also applied server-side, but we do a final client-side pass
    // to ensure we catch all matches across name, email, role, team, department
    let filteredPeople = people;

    if (roleId || q) {
      filteredPeople = people.filter((p) => {
        // Role filter (search by role title)
        if (roleId && p.role && !p.role.toLowerCase().includes(roleId.toLowerCase())) {
          return false;
        }

        // Search query filter (final pass to catch team/department names)
        if (q) {
          const queryLower = q.toLowerCase();
          const matchesSearch =
            p.name.toLowerCase().includes(queryLower) ||
            p.email.toLowerCase().includes(queryLower) ||
            (p.role && p.role.toLowerCase().includes(queryLower)) ||
            (p.team && p.team.toLowerCase().includes(queryLower)) ||
            (p.department && p.department.toLowerCase().includes(queryLower));
          if (!matchesSearch) return false;
        }

        return true;
      });
    }

    return NextResponse.json({
      ok: true,
      data: filteredPeople,
    });
  } catch (error) {
    console.error("[org-people-directory]", error);

    if (error instanceof OrgAuthError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load organization people directory.",
        },
      },
      { status: 500 }
    );
  }
}

