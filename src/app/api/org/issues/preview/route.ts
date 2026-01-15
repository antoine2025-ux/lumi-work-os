import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import crypto from "crypto";
import { selectEngineForOrg } from "@/server/loopbrain/selectEngine";

function hash(input: any) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  const body = (await req.json()) as { personIds: string[] };

  const ids = (body.personIds || []).filter(Boolean);
  if (!ids.length) return NextResponse.json({ ok: false, error: "personIds required" }, { status: 400 });

  // Fetch positions (people) for selected IDs
  const positions = await (prisma as any).orgPosition.findMany({
    where: {
      workspaceId,
      id: { in: ids },
      isActive: true,
      archivedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      parent: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // For better suggestions, fetch full org people context
  const allPositions = await (prisma as any).orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      archivedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      parent: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Map to person-like shape for suggestion computation
  const people = positions.map((pos: any) => ({
    id: pos.id,
    name: pos.user?.name || "Unnamed",
    email: pos.user?.email || null,
    title: pos.title,
    role: pos.title,
    teamName: pos.team?.name || null,
    team: pos.team?.name || null,
    managerId: pos.parent?.user?.id || null,
    managerName: pos.parent?.user?.name || null,
  }));

  const allPeople = allPositions.map((pos: any) => ({
    id: pos.id,
    name: pos.user?.name || "Unnamed",
    email: pos.user?.email || null,
    title: pos.title,
    role: pos.title,
    teamName: pos.team?.name || null,
    team: pos.team?.name || null,
    managerId: pos.parent?.user?.id || null,
    managerName: pos.parent?.user?.name || null,
  }));

  // Compute suggestions using LoopBrain engine (org-scoped selection)
  const { engine, engineId } = await selectEngineForOrg({ orgId: ctx.orgId, scope: "people_issues" });
  const suggestions = await engine.run({
    context: { orgId: ctx.orgId, scope: "people_issues" },
    people,
    allPeople,
  });

  // Build preview with before/after diffs
  const preview = people.map((p: any) => {
    const s = suggestions.find((x) => x.personId === p.id);
    const patch = s?.patch || {};
    const after: any = { ...p, ...patch };

    const diffs = Object.keys(patch)
      .filter((k) => patch[k as keyof typeof patch] !== undefined)
      .map((k) => ({
        field: k,
        before: (p as any)[k] ?? null,
        after: (after as any)[k] ?? null,
      }));

    return {
      personId: p.id,
      person: {
        id: p.id,
        name: p.name,
        email: p.email,
        teamName: p.teamName || p.team,
        managerName: p.managerName,
      },
      confidence: s?.confidence ?? 0.0,
      rationale: s?.rationale ?? "",
      evidence: s?.evidence ?? [],
      patch,
      diffs,
    };
  });

  // Optional traceability
  const inputHash = hash({ orgId: ctx.orgId, ids });
  const suggestionRun = await (prisma as any).orgSuggestionRun.create({
    data: {
      orgId: ctx.orgId,
      scope: "people_issues",
      inputHash,
      output: preview as any,
      engineId,
      modelId: engineId, // for now mirror; later separate "model version"
    },
  });

  return NextResponse.json({ ok: true, preview, suggestionRunId: suggestionRun.id, engineId });

  return NextResponse.json({ ok: true, preview });
}
