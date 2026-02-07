/**
 * Internal API: run people_issues suggestions (proactive / cron).
 * Suggest-only; apply remains via POST /api/org/issues/apply.
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET. If unset in production, returns 403.
 */

import { NextRequest, NextResponse } from "next/server";
import { runPeopleIssuesSuggestionsForOrg } from "@/server/loopbrain/runPeopleIssuesSuggestions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getCronSecret(): string | null {
  return process.env.LOOPBRAIN_CRON_SECRET ?? process.env.CRON_SECRET ?? null;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const headerSecret = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { workspaceId?: string; workspaceIds?: string[] };
  try {
    body = (await request.json()) as { workspaceId?: string; workspaceIds?: string[] };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON; expect { workspaceId?: string, workspaceIds?: string[] }" },
      { status: 400 }
    );
  }

  const workspaceIds: string[] = [];
  if (body.workspaceId) workspaceIds.push(body.workspaceId);
  if (Array.isArray(body.workspaceIds)) workspaceIds.push(...body.workspaceIds);
  const unique = [...new Set(workspaceIds)];

  if (unique.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Provide workspaceId or workspaceIds" },
      { status: 400 }
    );
  }

  const results: Array<{
    workspaceId: string;
    orgId: string;
    ok: boolean;
    skipped?: boolean;
    reason?: string;
    suggestionRunId?: string;
    suggestionCount?: number;
    engineId?: string;
    error?: string;
  }> = [];

  for (const workspaceId of unique) {
    // When workspace fallback is used, orgId === workspaceId
    const orgId = workspaceId;
    const result = await runPeopleIssuesSuggestionsForOrg({ orgId, workspaceId });

    if (result.ok) {
      results.push({
        workspaceId,
        orgId,
        ok: true,
        suggestionRunId: result.suggestionRunId,
        suggestionCount: result.suggestionCount,
        engineId: result.engineId,
      });
    } else if (result.skipped) {
      results.push({
        workspaceId,
        orgId,
        ok: false,
        skipped: true,
        reason: result.reason,
      });
    } else {
      results.push({
        workspaceId,
        orgId,
        ok: false,
        error: result.error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    results,
  });
}
