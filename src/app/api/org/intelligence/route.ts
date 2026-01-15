/**
 * Org Intelligence API Route
 * 
 * Phase 5: Returns computed org intelligence signals
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import {
  computeOrgIntelligence,
  getLatestIntelligenceSnapshot,
  saveIntelligenceSnapshot,
} from "@/lib/org/intelligence";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const maxAge = parseInt(searchParams.get("maxAge") || "60", 10);

    const workspaceId = auth.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Check for cached snapshot if not forcing refresh
    if (!forceRefresh) {
      const cached = await getLatestIntelligenceSnapshot(workspaceId);
      if (cached) {
        const ageMinutes = (Date.now() - cached.computedAt.getTime()) / (1000 * 60);
        if (ageMinutes < maxAge) {
          return NextResponse.json({
            ok: true,
            source: "cached",
            data: cached,
          });
        }
      }
    }

    // Compute fresh intelligence
    const result = await computeOrgIntelligence(workspaceId);

    // Save snapshot
    const snapshotId = await saveIntelligenceSnapshot(
      workspaceId,
      result,
      forceRefresh ? "refresh" : "on_demand"
    );

    return NextResponse.json({
      ok: true,
      source: "computed",
      snapshotId,
      data: result,
    });
  } catch (error) {
    console.error("Error computing org intelligence:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to compute org intelligence" },
      { status: 500 }
    );
  }
}

