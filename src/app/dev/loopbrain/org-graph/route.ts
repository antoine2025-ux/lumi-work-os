// src/app/dev/loopbrain/org-graph/route.ts

import { NextRequest, NextResponse } from "next/server";
import { buildOrgLoopbrainContextBundleForCurrentWorkspace } from "@/lib/loopbrain/org/buildOrgLoopbrainContextBundle";
import { getUnifiedAuth } from "@/lib/unified-auth";

export const dynamic = "force-dynamic";

/**
 * GET /dev/loopbrain/org-graph
 *
 * Dev-only endpoint that returns the OrgLoopbrainContextBundle for the current workspace.
 * This is used by the Org Inspector UI to visualize how Loopbrain "sees" the org graph.
 *
 * Protected: Only authenticated users in that workspace can access it.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user and ensure workspace access
    const auth = await getUnifiedAuth(request);

    if (!auth.workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No workspace found",
          detail: "User must have an active workspace",
        },
        { status: 401 }
      );
    }

    const bundle =
      await buildOrgLoopbrainContextBundleForCurrentWorkspace();

    return NextResponse.json(
      {
        ok: true,
        bundle,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET /dev/loopbrain/org-graph error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    // Handle authentication errors
    if (
      message.includes("Unauthorized") ||
      message.includes("No workspace found") ||
      message.includes("no current workspace found")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthenticated",
          detail: message,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Org Loopbrain graph",
        detail: message,
      },
      { status: 500 }
    );
  }
}

