/**
 * Dev-only Org QA Endpoint
 * 
 * Internal endpoint to run the full Org → Loopbrain pipeline
 * for debugging and testing org intelligence.
 * 
 * POST /api/dev/org-qa
 * Body: { workspaceId: string, question: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { runOrgQa } from "@/lib/loopbrain/orgQaService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/authOptions";
import { isOrgLoopbrainEnabled } from "@/lib/loopbrain/orgGate";

export async function POST(req: NextRequest) {
  try {
    // DEV ONLY - block in production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    // Get userId for telemetry (optional, won't fail if unavailable)
    let userId: string | undefined = undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id;
    } catch (authError) {
      // Non-fatal - telemetry will log userId as null
      console.warn("[OrgQA] Could not resolve userId for telemetry", authError);
    }

    const body = await req.json();
    const { workspaceId, question } = body || {};

    if (!workspaceId || !question) {
      return NextResponse.json(
        { error: "workspaceId and question are required" },
        { status: 400 }
      );
    }

    if (typeof workspaceId !== "string" || typeof question !== "string") {
      return NextResponse.json(
        { error: "workspaceId and question must be strings" },
        { status: 400 }
      );
    }

    // Check if Org Loopbrain is enabled (dev-friendly: allow in dev even if flag disabled)
    const enabled = await isOrgLoopbrainEnabled(workspaceId);
    if (!enabled && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          ok: false,
          error: "Org Loopbrain is not enabled for this workspace.",
        },
        { status: 403 }
      );
    }

    const result = await runOrgQa(workspaceId, question, userId);

    return NextResponse.json(
      {
        ok: true,
        workspaceId,
        question,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[OrgQA] Failed to run org QA", { error });
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

