// src/app/api/dev/org-self-test/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgRoutingStats,
  getOrgRoutingEvents,
} from "@/lib/loopbrain/org/telemetry";
import {
  buildOrgLoopbrainContextBundleForWorkspace,
} from "@/lib/loopbrain/org/buildOrgLoopbrainContextBundle";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-self-test
 *
 * Dev-only endpoint that runs a quick health check for Org → Loopbrain integration:
 * - Checks workspace exists
 * - Tries to build Org context bundle
 * - Inspects routing telemetry
 *
 * Returns JSON summary of integration status.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Org self-test is only available in development." },
      { status: 404 }
    );
  }

  try {
    // 1) Check at least one workspace exists
    const workspace = await prisma.workspace.findFirst({
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({
        ok: false,
        reason: "no_workspace",
        details: "No workspace found in DB. Seed or create one first.",
      });
    }

    // 2) Try to build Org context bundle
    let orgBundleOk = false;
    let orgBundleError: string | null = null;
    let orgBundleNodeCount = 0;

    try {
      const bundle = await buildOrgLoopbrainContextBundleForWorkspace(
        workspace.id
      );

      orgBundleOk =
        !!bundle &&
        bundle.primary !== null &&
        Object.keys(bundle.byId || {}).length > 0;
      orgBundleNodeCount = Object.keys(bundle.byId || {}).length;
    } catch (err: unknown) {
      orgBundleOk = false;
      orgBundleError = err instanceof Error ? err.message : "Unknown Org bundle error";
    }

    // 3) Inspect telemetry snapshot
    const stats = getOrgRoutingStats();
    const events = getOrgRoutingEvents();

    return NextResponse.json({
      ok: true,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      orgBundle: {
        ok: orgBundleOk,
        error: orgBundleError,
        nodeCount: orgBundleNodeCount,
      },
      routingStats: stats,
      recentEventsCount: events.length,
      recentSample: events.slice(0, 3).map((e) => ({
        question: e.question.substring(0, 100) + (e.question.length > 100 ? "..." : ""),
        mode: e.mode,
        wantsOrg: e.wantsOrg,
        hasOrgContext: e.hasOrgContext,
        timestamp: e.timestamp,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error during Org self-test";
    return NextResponse.json(
      {
        ok: false,
        reason: "exception",
        error: message,
      },
      { status: 500 }
    );
  }
}

