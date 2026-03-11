// src/app/api/dev/org-debug/route.ts

import { NextResponse } from "next/server";
import { getLastOrgDebugSnapshot } from "@/lib/loopbrain/llm-caller";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-debug
 *
 * Dev-only endpoint that returns the last Org debug snapshot.
 * Used by the Org Debug panel to inspect routing decisions.
 *
 * Returns 404 in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Org debug endpoint is only available in development." },
      { status: 404 }
    );
  }

  const snapshot = getLastOrgDebugSnapshot();

  return NextResponse.json({
    ok: true,
    snapshot,
  });
}

