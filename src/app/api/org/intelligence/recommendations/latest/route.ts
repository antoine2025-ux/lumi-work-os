/**
 * GET /api/org/intelligence/recommendations/latest
 * Get actionable recommendations from the latest intelligence snapshot.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import type { Prisma } from '@prisma/client'
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { buildRecommendations } from "@/server/org/intelligence/recommendations/build";

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
          recommendations: [],
          hint: "Authentication required to load recommendations."
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

    // Step 4: Get latest snapshot
    const latest = await prisma.orgIntelligenceSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, findingsJson: true },
    });

    if (!latest) {
      return NextResponse.json({ snapshot: null, recommendations: [] }, { status: 200 });
    }

    // Step 5: Build recommendations from findings
    const findings = Array.isArray(latest.findingsJson)
      ? latest.findingsJson
      : [];
    // @ts-expect-error — buildRecommendations expects OrgIntelligenceFinding[] but we have JsonArray from DB
    const recommendations = buildRecommendations(findings);

    return NextResponse.json(
      {
        snapshot: { id: latest.id, createdAt: latest.createdAt.toISOString() },
        recommendations,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Recommendations are currently unavailable.";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[GET /api/org/intelligence/recommendations/latest] Error:", error);
    console.error("[GET /api/org/intelligence/recommendations/latest] Error stack:", stack);

    return NextResponse.json(
      {
        snapshot: null,
        recommendations: [],
        hint: message,
      },
      { status: 200 }
    );
  }
}

