// src/app/api/org/people/roles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getRolesForPerson } from "@/lib/org/roleQueries";

export async function POST(req: NextRequest) {
  try {
    const { personContextId } = await req.json().catch(() => ({}));

    if (!personContextId || typeof personContextId !== "string") {
      return NextResponse.json(
        { ok: false, error: "personContextId is required" },
        { status: 400 }
      );
    }

    const workspaceId = await getCurrentWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Workspace not found" },
        { status: 401 }
      );
    }

    const roles = await getRolesForPerson(workspaceId, personContextId);

    const simplified = roles.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary ?? "",
      tags: r.tags ?? [],
      owner: r.owner ?? null,
    }));

    return NextResponse.json({ ok: true, roles: simplified });
  } catch (err: any) {
    console.error("[Org] Failed to get roles for person", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to get roles for person" },
      { status: 500 }
    );
  }
}

