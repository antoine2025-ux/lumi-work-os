/**
 * Internal API: run any registered proactive engine by key.
 *
 * POST /api/internal/loopbrain/run
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET (or CRON_SECRET). If unset in production, returns 403.
 *
 * Body: { engineKey: string, workspaceId?: string, workspaceIds?: string[] }
 *
 * Engines are resolved from the proactive engine registry
 * (src/server/loopbrain/engines/registry.ts). Each engine must only write
 * OrgSuggestionRun / LoopBrainOutcome records — no direct mutations.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getProactiveEngine,
  listProactiveEngines,
  type ProactiveEngineResult,
} from "@/server/loopbrain/engines/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Auth — identical pattern to /api/internal/loopbrain/people-issues/run
// ---------------------------------------------------------------------------

function getCronSecret(): string | null {
  return (
    process.env.LOOPBRAIN_CRON_SECRET ?? process.env.CRON_SECRET ?? null
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const headerSecret =
    request.headers.get("x-cron-secret") ??
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
  return headerSecret === secret;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  let body: {
    engineKey?: string;
    workspaceId?: string;
    workspaceIds?: string[];
  };
  try {
    body = (await request.json()) as {
      engineKey?: string;
      workspaceId?: string;
      workspaceIds?: string[];
    };
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid JSON; expect { engineKey: string, workspaceId?: string, workspaceIds?: string[] }",
      },
      { status: 400 },
    );
  }

  // Validate engineKey
  const engineKey = body.engineKey?.trim();
  if (!engineKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing 'engineKey'. Available engines: " +
          listProactiveEngines()
            .map((e) => e.key)
            .join(", "),
      },
      { status: 400 },
    );
  }

  const engine = getProactiveEngine(engineKey);
  if (!engine) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown engineKey "${engineKey}". Available: ${listProactiveEngines()
          .map((e) => e.key)
          .join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Collect workspace IDs
  const workspaceIds: string[] = [];
  if (body.workspaceId) workspaceIds.push(body.workspaceId);
  if (Array.isArray(body.workspaceIds)) workspaceIds.push(...body.workspaceIds);
  const unique = [...new Set(workspaceIds)];

  if (unique.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Provide workspaceId or workspaceIds" },
      { status: 400 },
    );
  }

  // Run engine for each workspace
  const results: Array<{
    workspaceId: string;
  } & ProactiveEngineResult> = [];

  for (const workspaceId of unique) {
    try {
      const result = await engine.run({ workspaceId });
      results.push({ workspaceId, ...result });
    } catch (err) {
      results.push({
        workspaceId,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    engineKey,
    results,
  });
}
