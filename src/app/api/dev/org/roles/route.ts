// src/app/api/dev/org/roles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getRoleContextItemsForWorkspace } from "@/lib/context/contextItemQueries";
import { validateRoleGraph } from "@/lib/org/roleGraphValidation";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Org roles debug API is only available in development." },
      { status: 404 }
    );
  }

  let workspaceId: string | null = null;
  try {
    workspaceId = await getCurrentWorkspaceId(req);
  } catch (error) {
    return NextResponse.json(
      { error: "Workspace not found for Org roles debug." },
      { status: 400 }
    );
  }

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found for Org roles debug." },
      { status: 400 }
    );
  }

  try {
    const roleContextItems = await getRoleContextItemsForWorkspace(workspaceId);
    const validation = validateRoleGraph(roleContextItems);

    // Derive a compact roles table for the UI
    const rolesTable = roleContextItems.map((role) => {
      const relations = role.relations ?? [];

      const ownerRelation = relations.find(
        (rel) =>
          rel.type === "owned_by" &&
          rel.targetId &&
          rel.targetId.startsWith("person:")
      );

      const teamRelation = relations.find(
        (rel) =>
          rel.type === "member_of_team" &&
          rel.targetId &&
          rel.targetId.startsWith("team:")
      );

      const departmentRelation = relations.find(
        (rel) =>
          rel.type === "member_of_department" &&
          rel.targetId &&
          rel.targetId.startsWith("department:")
      );

      const responsibilitiesTag = (role.tags ?? []).find((t) =>
        t.startsWith("responsibilities:")
      );

      return {
        id: role.id,
        title: role.title,
        ownerId: role.owner,
        ownerPersonId: ownerRelation?.targetId ?? null,
        teamId: teamRelation?.targetId ?? null,
        departmentId: departmentRelation?.targetId ?? null,
        responsibilitiesCount: responsibilitiesTag
          ? Number(responsibilitiesTag.split(":")[1] || "0")
          : 0,
        status: role.status,
        updatedAt: role.updatedAt,
      };
    });

    return NextResponse.json({
      ok: true,
      roles: rolesTable,
      validation,
    });
  } catch (err: any) {
    console.error("[Org] Failed to fetch roles for dev debug", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Failed to fetch roles for dev debug.",
      },
      { status: 500 }
    );
  }
}

