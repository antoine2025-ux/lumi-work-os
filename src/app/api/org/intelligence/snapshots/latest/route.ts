/**
 * GET /api/org/intelligence/snapshots/latest
 * Get the most recent intelligence snapshot (read-only convenience).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 * 
 * Returns the newest snapshot with limited findings for Overview display.
 * This reads persisted snapshots only; it does NOT compute intelligence on the fly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { getOrCreateIntelligenceSettings } from "@/server/org/intelligence/settings";
import { computeSnapshotFreshness } from "@/server/org/intelligence/freshness";

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      // Return empty state for optional endpoint
      return NextResponse.json(
        { 
          snapshot: null,
          freshness: {
            hasSnapshot: false,
            snapshotId: null,
            snapshotCreatedAt: null,
            ageMinutes: null,
            status: "MISSING" as const,
            policy: { freshMinutes: 60, warnMinutes: 120 },
          },
          hint: "Authentication required to load intelligence data."
        },
        { status: 200 }
      );
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Get latest snapshot and settings
    // Schema truth: If model/table doesn't exist, Prisma will throw.
    // This enforces that migrations must be applied.
    // Check if model exists to prevent "Cannot read properties of undefined" error
    if (!prisma.orgIntelligenceSnapshot) {
      throw new Error("Prisma client is stale - please run 'pnpm prisma generate'. The orgIntelligenceSnapshot model is missing.");
    }
    
    const latest = await prisma.orgIntelligenceSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        source: true,
        findingCount: true,
        findingsJson: true,
        rollupsJson: true,
      },
    });

    const settings = await getOrCreateIntelligenceSettings();

    if (!latest) {
      // Compute freshness even when no snapshot exists
      const freshness = computeSnapshotFreshness({
        createdAt: null,
        freshMinutes: settings.snapshotFreshMinutes,
        warnMinutes: settings.snapshotWarnMinutes,
      });
      return NextResponse.json({ snapshot: null, freshness }, { status: 200 });
    }

    // Limit payload for overview (first 12 findings)
    const findings = Array.isArray(latest.findingsJson) ? latest.findingsJson : [];
    const limited = findings.slice(0, 12);

    // Compute freshness
    const freshness = computeSnapshotFreshness({
      createdAt: latest.createdAt,
      freshMinutes: settings.snapshotFreshMinutes,
      warnMinutes: settings.snapshotWarnMinutes,
    });
    freshness.snapshotId = latest.id;

    return NextResponse.json(
      {
        snapshot: {
          id: latest.id,
          createdAt: latest.createdAt.toISOString(),
          source: latest.source,
          findingCount: latest.findingCount,
          findings: limited,
          rollups: latest.rollupsJson || null,
        },
        freshness,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET /api/org/intelligence/snapshots/latest] Error:", error);
    console.error("[GET /api/org/intelligence/snapshots/latest] Error stack:", error?.stack);

    // Always return empty state for optional endpoint - never 500
    const settings = await getOrCreateIntelligenceSettings().catch(() => ({
      snapshotFreshMinutes: 60,
      snapshotWarnMinutes: 120,
    }));
    
    return NextResponse.json(
      {
        snapshot: null,
        freshness: {
          hasSnapshot: false,
          snapshotId: null,
          snapshotCreatedAt: null,
          ageMinutes: null,
          status: "MISSING" as const,
          policy: {
            freshMinutes: settings.snapshotFreshMinutes || 60,
            warnMinutes: settings.snapshotWarnMinutes || 120,
          },
        },
        hint: error?.message || "Intelligence data is currently unavailable.",
      },
      { status: 200 }
    );
  }
}

