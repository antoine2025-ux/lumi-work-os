/**
 * GET /api/org/coverage/resolve
 * 
 * Resolve role coverage with ranked candidates.
 * 
 * Query params:
 * - roleType: string (required)
 * - primaryPersonId: string (optional - if not provided, returns all for roleType)
 * - start: ISO 8601 UTC string (required)
 * - end: ISO 8601 UTC string (required)
 * 
 * Returns ranked candidates with reasons. UI must NOT re-implement ranking.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { getRoleCoverages, resolveCoverage, type RoleCoverage } from "@/lib/org/coverage";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getWorkspaceThresholds, getCoverageResponseMeta } from "@/lib/org/capacity/thresholds";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate query params
    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get("roleType");
    const primaryPersonId = searchParams.get("primaryPersonId");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!roleType) {
      return NextResponse.json(
        { error: "roleType query parameter is required" },
        { status: 400 }
      );
    }

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end query parameters are required (ISO 8601 UTC)" },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startParam);
    const end = new Date(endParam);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 UTC" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "end must be after start" },
        { status: 400 }
      );
    }

    // Step 5: Fetch coverage definitions
    let coverages = await getRoleCoverages(workspaceId);
    coverages = coverages.filter((c) => c.roleType === roleType);
    
    if (primaryPersonId) {
      coverages = coverages.filter((c) => c.primaryPersonId === primaryPersonId);
    }

    if (coverages.length === 0) {
      return NextResponse.json({
        ok: true,
        resolutions: [],
        thresholds: getWorkspaceThresholds(workspaceId),
      });
    }

    // Step 6: Collect all person IDs we need capacity for
    const allPersonIds = new Set<string>();
    for (const coverage of coverages) {
      allPersonIds.add(coverage.primaryPersonId);
      for (const secondaryId of coverage.secondaryPersonIds) {
        allPersonIds.add(secondaryId);
      }
    }

    // Step 7: Batch resolve capacity for all relevant people
    const timeWindow = { start, end };
    const capacitiesMap = await resolveEffectiveCapacityBatch(
      workspaceId,
      Array.from(allPersonIds),
      timeWindow
    );

    const thresholds = getWorkspaceThresholds(workspaceId);

    // Step 8: Get person names for display
    const personNames = await getPersonNames(Array.from(allPersonIds));

    // Step 9: Resolve each coverage with ranking
    const resolutions = coverages.map((coverage) => {
      const resolution = resolveCoverage(
        coverage,
        capacitiesMap,
        thresholds.minCapacityForCoverage
      );

      // Get primary's capacity
      const primaryCapacity = capacitiesMap.get(coverage.primaryPersonId);
      const primaryName = personNames.get(coverage.primaryPersonId) ?? coverage.primaryPersonId;

      // Build ranked candidates list
      const candidates = resolution.allSecondaries.map((secondary, index) => {
        const capacity = capacitiesMap.get(secondary.personId);
        const personName = personNames.get(secondary.personId) ?? secondary.personId;
        
        // Determine "whyChosen" reason
        let whyChosen: string;
        if (!secondary.isAvailable) {
          whyChosen = "Unavailable in window";
        } else if (!secondary.hasCapacity) {
          whyChosen = `Insufficient capacity (< ${thresholds.minCapacityForCoverage}h)`;
        } else if (capacity) {
          whyChosen = `Available with ${capacity.effectiveAvailableHours.toFixed(1)}h capacity`;
        } else {
          whyChosen = "Available (no capacity data)";
        }

        return {
          personId: secondary.personId,
          personName,
          rank: index + 1,
          available: secondary.isAvailable,
          hasCapacity: secondary.hasCapacity,
          effectiveCapacity: capacity ? {
            weeklyCapacityHours: capacity.weeklyCapacityHours,
            contractedHoursForWindow: capacity.contractedHoursForWindow,
            availabilityFactor: capacity.availabilityFactor,
            allocatedHours: capacity.allocatedHours,
            effectiveAvailableHours: capacity.effectiveAvailableHours,
          } : null,
          confidence: capacity ? {
            score: capacity.confidence.score,
            explanation: capacity.confidence.explanation,
          } : { score: 0, explanation: ["No capacity data available"] },
          whyChosen,
        };
      });

      // Sort candidates: available+hasCapacity first, then by effectiveAvailableHours descending
      // Final tie-breaker: personId for deterministic ordering
      candidates.sort((a, b) => {
        // First: viable candidates (available + hasCapacity)
        const aViable = a.available && a.hasCapacity ? 1 : 0;
        const bViable = b.available && b.hasCapacity ? 1 : 0;
        if (aViable !== bViable) return bViable - aViable;

        // Second: by effectiveAvailableHours descending
        const aHours = a.effectiveCapacity?.effectiveAvailableHours ?? 0;
        const bHours = b.effectiveCapacity?.effectiveAvailableHours ?? 0;
        if (aHours !== bHours) return bHours - aHours;

        // Third: deterministic tie-breaker by personId (prevents jitter across runs)
        return a.personId.localeCompare(b.personId);
      });

      // Re-assign ranks after sorting
      candidates.forEach((c, i) => { c.rank = i + 1; });

      // Find best candidate (first viable one after sorting)
      const bestCandidate = candidates.find((c) => c.available && c.hasCapacity)?.personId ?? null;

      return {
        roleType: coverage.roleType,
        roleLabel: coverage.roleLabel,
        primary: {
          personId: coverage.primaryPersonId,
          personName: primaryName,
          available: resolution.primaryAvailable,
          effectiveCapacity: primaryCapacity ? {
            weeklyCapacityHours: primaryCapacity.weeklyCapacityHours,
            contractedHoursForWindow: primaryCapacity.contractedHoursForWindow,
            availabilityFactor: primaryCapacity.availabilityFactor,
            allocatedHours: primaryCapacity.allocatedHours,
            effectiveAvailableHours: primaryCapacity.effectiveAvailableHours,
          } : null,
        },
        candidates,
        bestCandidate,
        explanation: resolution.explanation,
      };
    });

    return NextResponse.json({
      ok: true,
      resolutions,
      timeWindow: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      thresholds: {
        lowCapacityHoursThreshold: thresholds.lowCapacityHoursThreshold,
        overallocationThreshold: thresholds.overallocationThreshold,
        minCapacityForCoverage: thresholds.minCapacityForCoverage,
      },
      responseMeta: getCoverageResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/coverage/resolve] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Get person names by IDs
 */
async function getPersonNames(personIds: string[]): Promise<Map<string, string>> {
  if (personIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: personIds } },
    select: { id: true, name: true, email: true },
  });

  const result = new Map<string, string>();
  for (const user of users) {
    result.set(user.id, user.name ?? user.email ?? user.id);
  }
  return result;
}
