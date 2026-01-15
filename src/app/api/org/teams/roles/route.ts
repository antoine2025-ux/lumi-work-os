// src/app/api/org/teams/roles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getRolesForTeam } from "@/lib/org/roleQueries";

export async function POST(req: NextRequest) {
  try {
    const { teamContextId } = await req.json().catch(() => ({}));

    if (!teamContextId || typeof teamContextId !== "string") {
      return NextResponse.json(
        { ok: false, error: "teamContextId is required" },
        { status: 400 }
      );
    }

    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const roles = await getRolesForTeam(workspaceId, teamContextId);

    const simplified = roles.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary ?? "",
      tags: r.tags ?? [],
    }));

    return NextResponse.json({ ok: true, roles: simplified });
  } catch (err: any) {
    console.error("[Org] Failed to get roles for team", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to get roles for team" },
      { status: 500 }
    );
  }
}

