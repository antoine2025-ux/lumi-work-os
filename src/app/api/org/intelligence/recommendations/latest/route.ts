/**
 * GET /api/org/intelligence/recommendations/latest
 * Get actionable recommendations from the latest intelligence snapshot.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
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
      ? (latest.findingsJson as any[])
      : [];
    const recommendations = buildRecommendations(findings as any);

    return NextResponse.json(
      {
        snapshot: { id: latest.id, createdAt: latest.createdAt.toISOString() },
        recommendations,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET /api/org/intelligence/recommendations/latest] Error:", error);
    console.error("[GET /api/org/intelligence/recommendations/latest] Error stack:", error?.stack);

    // Always return empty state for optional endpoint - never 500
    return NextResponse.json(
      {
        snapshot: null,
        recommendations: [],
        hint: error?.message || "Recommendations are currently unavailable.",
      },
      { status: 200 }
    );
  }
}

