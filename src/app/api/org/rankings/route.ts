// src/app/api/org/rankings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { buildOrgLoopbrainContextBundleForWorkspace } from "@/lib/loopbrain/org/buildOrgLoopbrainContextBundle";
import { computeOrgHealthSignals } from "@/lib/org/healthService";
import type { OrgHealth } from "@/lib/org/healthTypes";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 401 });
    }

    // Build Org bundle to get all ContextObjects
    const bundle = await buildOrgLoopbrainContextBundleForWorkspace(workspaceId);

    // Extract ContextObjects by type
    const people = bundle.related.filter((obj) => obj.type === "person");
    const teams = bundle.related.filter((obj) => obj.type === "team");
    const departments = bundle.related.filter((obj) => obj.type === "department");
    const roles = bundle.related.filter((obj) => obj.type === "role");

    // Compute tree depth (simplified - count max depth from org root)
    const treeDepth = Math.max(
      departments.length > 0 ? 2 : 1,
      teams.length > 0 ? 3 : 1
    );

    // Compute health signals
    const health = computeOrgHealthSignals({
      people,
      teams,
      departments,
      roles,
      treeDepth,
    }) as OrgHealth;

    // Extract role risks from health
    const roleHealth = health.roles;

    const roleRisks = roleHealth
      ? {
          withoutOwner: roleHealth.details.rolesWithoutOwner,
          withoutResponsibilities: roleHealth.details.rolesWithoutResponsibilities,
          withoutTeam: roleHealth.details.rolesWithoutTeam,
          withoutDepartment: roleHealth.details.rolesWithoutDepartment,
        }
      : {
          withoutOwner: [],
          withoutResponsibilities: [],
          withoutTeam: [],
          withoutDepartment: [],
        };

    // Simple rankings (can be extended later)
    const rankings = {
      overloadedManagers: people
        .filter((p) => {
          const relations = p.relations ?? [];
          const directReports = relations.filter(
            (rel) => rel.type === "reports_to" && rel.targetId === p.id
          );
          return directReports.length > 7;
        })
        .map((p) => ({
          id: p.id,
          title: p.title,
          count: p.relations?.filter(
            (rel) => rel.type === "reports_to" && rel.targetId === p.id
          ).length ?? 0,
        })),
      singlePersonTeams: teams
        .filter((t) => {
          const relations = t.relations ?? [];
          const members = relations.filter(
            (rel) => rel.type === "has_person" || rel.type === "has_member"
          );
          return members.length === 1;
        })
        .map((t) => ({
          id: t.id,
          title: t.title,
        })),
    };

    return NextResponse.json({
      ok: true,
      rankings,
      health,
      roleRisks,
    });
  } catch (err: any) {
    console.error("[Org] Failed to compute rankings", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Failed to compute org rankings",
      },
      { status: 500 }
    );
  }
}

