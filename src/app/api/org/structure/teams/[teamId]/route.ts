/**
 * GET    /api/org/structure/teams/[teamId] — Get team detail with members
 * PUT    /api/org/structure/teams/[teamId] — Update a team (ADMIN)
 * DELETE /api/org/structure/teams/[teamId] — Delete a team (ADMIN)
 *
 * Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
import { UpdateTeamSchema } from "@/lib/validations/org";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ teamId: string }> }
) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/structure/teams/[teamId]] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const { teamId } = await ctx.params;

    const team = await prisma.orgTeam.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        departmentId: true,
        ownerPersonId: true,
        positions: {
          where: {
            userId: { not: null },
            isActive: true,
          },
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            // Get person availability via OrgPerson if available
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { 
          error: "Team not found",
          hint: "The requested team does not exist or you don't have access to it."
        },
        { status: 404 }
      );
    }

    // Build members array - OrgPosition already has userId and we can get title from it
    // For availability, we'll need to query OrgPerson separately if it exists
    // For now, return minimal member info
    const members = team.positions
      .filter((p) => p.user)
      .map((p) => {
        return {
          personId: p.id,
          fullName: p.user!.name || p.user!.email || "Unknown",
          email: p.user!.email,
          title: null as string | null, // Title would come from OrgPosition.title if needed
          availabilityStatus: "UNKNOWN" as
            | "UNKNOWN"
            | "AVAILABLE"
            | "PARTIALLY_AVAILABLE"
            | "UNAVAILABLE",
        };
      });

    return NextResponse.json(
      {
        team: {
          id: team.id,
          name: team.name,
          departmentId: team.departmentId,
          ownerPersonId: team.ownerPersonId,
          members,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ teamId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const { teamId } = await ctx.params;
    const body = UpdateTeamSchema.parse(await request.json());
    const { name, description, departmentId, leaderId, color } = body;

    const team = await prisma.orgTeam.findFirst({
      where: { id: teamId, workspaceId },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const updated = await prisma.orgTeam.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(leaderId !== undefined && { leaderId: leaderId || null }),
        ...(color !== undefined && { color: color || null }),
      },
    });

    return NextResponse.json({ ok: true, team: updated });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ teamId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const { teamId } = await ctx.params;

    const team = await prisma.orgTeam.findFirst({
      where: { id: teamId, workspaceId },
      include: { _count: { select: { positions: { where: { isActive: true } } } } },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (team._count.positions > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${team._count.positions} active position(s) still in this team. Move or archive them first.` },
        { status: 400 }
      );
    }

    await prisma.orgTeam.delete({ where: { id: teamId } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
