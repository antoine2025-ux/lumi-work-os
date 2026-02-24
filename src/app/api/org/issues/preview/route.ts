import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { selectEngineForOrg } from "@/server/loopbrain/selectEngine";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

function hash(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const orgId = auth.workspaceId;
    const workspaceId = auth.workspaceId;

    const body = (await req.json()) as { personIds: string[] };
    const ids = (body.personIds || []).filter(Boolean);
    if (!ids.length) return NextResponse.json({ ok: false, error: "personIds required" }, { status: 400 });

    const positionQuery = {
      isActive: true,
      archivedAt: null,
      include: {
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        parent: { include: { user: { select: { id: true, name: true } } } },
      },
    };

    const [positions, allPositions] = await Promise.all([
      prisma.orgPosition.findMany({ where: { workspaceId, id: { in: ids }, ...positionQuery }, include: positionQuery.include }),
      prisma.orgPosition.findMany({ where: { workspaceId, ...positionQuery }, include: positionQuery.include }),
    ]);

    const toPersonShape = (pos: typeof positions[0]) => ({
      id: pos.id,
      name: pos.user?.name || "Unnamed",
      email: pos.user?.email || null,
      title: pos.title,
      role: pos.title,
      teamName: pos.team?.name || null,
      team: pos.team?.name || null,
      managerId: pos.parent?.user?.id || null,
      managerName: pos.parent?.user?.name || null,
    });

    const people = positions.map(toPersonShape);
    const allPeople = allPositions.map(toPersonShape);

    const { engine, engineId } = await selectEngineForOrg({ orgId, scope: "people_issues" });
    const suggestions = await engine.run({ context: { orgId, scope: "people_issues" }, people, allPeople });

    const preview = people.map((p) => {
      const s = suggestions.find((x) => x.personId === p.id);
      const patch = s?.patch || {};
      const after: Record<string, unknown> = { ...p, ...patch };

      const diffs = Object.keys(patch)
        .filter((k) => patch[k as keyof typeof patch] !== undefined)
        .map((k) => ({
          field: k,
          before: (p as Record<string, unknown>)[k] ?? null,
          after: after[k] ?? null,
        }));

      return {
        personId: p.id,
        person: { id: p.id, name: p.name, email: p.email, teamName: p.teamName || p.team, managerName: p.managerName },
        confidence: s?.confidence ?? 0.0,
        rationale: s?.rationale ?? "",
        evidence: s?.evidence ?? [],
        patch,
        diffs,
      };
    });

    const inputHash = hash({ orgId, ids });
    const suggestionRun = await prisma.orgSuggestionRun.create({
      data: {
        orgId,
        scope: "people_issues",
        inputHash,
        output: preview as Parameters<typeof prisma.orgSuggestionRun.create>[0]['data']['output'],
        engineId,
        modelId: engineId,
      },
    });

    return NextResponse.json({ ok: true, preview, suggestionRunId: suggestionRun.id, engineId });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
