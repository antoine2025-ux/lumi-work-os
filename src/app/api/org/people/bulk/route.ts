import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgContext } from "@/server/rbac";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error) {
      console.error("[POST /api/org/people/bulk] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }
    if (!ctx.canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { personIds, patch } = body ?? {};
    if (!Array.isArray(personIds) || personIds.length === 0) return badRequest("personIds must be a non-empty array");
    if (!patch || typeof patch !== "object") return badRequest("patch is required");

    // Allowed patch keys (keep this strict)
    const allowedKeys = new Set(["managerId", "teamName", "roleName", "title"]);
    for (const k of Object.keys(patch)) {
      if (!allowedKeys.has(k)) return badRequest(`Unsupported patch field: ${k}`);
      if (patch[k] !== null && patch[k] !== undefined && typeof patch[k] !== "string") {
        return badRequest(`${k} must be a string or null`);
      }
    }

    const workspaceId = auth.workspaceId;

    // Safety: ensure all personIds belong to this workspace
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        userId: { in: personIds },
        isActive: true,
      },
      select: { id: true, userId: true },
    });

    if (positions.length !== personIds.length) {
      return badRequest("Some personIds do not belong to this workspace");
    }

    // Build update data
    const updateData: any = {};
    
    if (patch.title !== undefined) {
      updateData.title = patch.title;
    }
    
    // For manager assignment, we need to find the manager's position
    if (patch.managerId !== undefined) {
      if (patch.managerId === null) {
        updateData.parentId = null;
      } else {
        const managerPosition = await prisma.orgPosition.findFirst({
          where: {
            workspaceId,
            userId: patch.managerId,
            isActive: true,
          },
          select: { id: true },
        });
        if (managerPosition) {
          updateData.parentId = managerPosition.id;
        }
      }
    }

    // For team assignment
    if (patch.teamName !== undefined && patch.teamName) {
      let team = await prisma.orgTeam.findFirst({
        where: {
          workspaceId,
          name: patch.teamName.trim(),
        },
      });
      
      if (!team) {
        // Create a default department if needed
        let department = await prisma.orgDepartment.findFirst({
          where: { workspaceId },
        });
        if (!department) {
          department = await prisma.orgDepartment.create({
            data: {
              workspaceId,
              name: "Default",
              isActive: true,
            },
          });
        }
        // Create the team
        team = await prisma.orgTeam.create({
          data: {
            workspaceId,
            name: patch.teamName.trim(),
            departmentId: department.id,
          },
        });
      }
      updateData.teamId = team.id;
    }

    // Update all positions
    const positionIds = positions.map(p => p.id);
    await prisma.orgPosition.updateMany({
      where: {
        id: { in: positionIds },
      },
      data: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error in bulk people update:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update people" } },
      { status: 500 }
    );
  }
}
