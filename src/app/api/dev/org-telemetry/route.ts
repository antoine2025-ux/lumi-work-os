// src/app/api/dev/org-telemetry/route.ts

import { NextResponse } from "next/server";
import {
  getOrgRoutingEvents,
  getOrgRoutingStats,
} from "@/lib/loopbrain/org/telemetry";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-telemetry
 *
 * Dev-only endpoint that returns Org routing telemetry.
 * Shows stats and recent events for debugging routing decisions.
 *
 * Returns 404 in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Org telemetry is only available in development." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    stats: getOrgRoutingStats(),
    events: getOrgRoutingEvents(),
  });
}

