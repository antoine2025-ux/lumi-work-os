/**
 * Org Intelligence API Route
 *
 * Phase 5: Returns computed org intelligence signals
 * Phase S: Canonical resolver layer with include params
 *
 * Query params:
 * - include: comma-separated list of sections (structure,ownership,people,capacity)
 * - version: "v2" for Phase S snapshot, omit for legacy
 * - refresh: "true" to force refresh (legacy only)
 * - maxAge: cache max age in minutes (legacy only)
 *
 * SECURITY: workspaceId is derived from auth, never from query params.
 * See docs/org/intelligence-rules.md for canonical rules.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import {
  computeOrgIntelligence,
  getLatestIntelligenceSnapshot,
  saveIntelligenceSnapshot,
  getOrgIntelligenceSnapshotDTO,
  type SnapshotOptions,
} from "@/lib/org/intelligence";

/**
 * Parse include param into SnapshotOptions
 */
function parseIncludeParam(includeParam: string | null): SnapshotOptions["include"] {
  if (!includeParam) {
    // Default: all sections
    return {
      structure: true,
      ownership: true,
      people: true,
      capacity: true,
    };
  }

  const sections = includeParam.split(",").map((s) => s.trim().toLowerCase());

  return {
    structure: sections.includes("structure"),
    ownership: sections.includes("ownership"),
    people: sections.includes("people"),
    capacity: sections.includes("capacity"),
  };
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: workspaceId from auth only, never from query params
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId;

    if (!auth.isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version");

    // Phase S: New resolver-based snapshot (v2)
    if (version === "v2") {
      const includeParam = searchParams.get("include");
      const include = parseIncludeParam(includeParam);

      const snapshot = await getOrgIntelligenceSnapshotDTO(workspaceId, { include });

      return NextResponse.json({
        ok: true,
        source: "computed",
        version: "v2",
        data: snapshot,
      });
    }

    // Legacy path (Phase 5) - preserved for backward compatibility
    const forceRefresh = searchParams.get("refresh") === "true";
    const maxAge = parseInt(searchParams.get("maxAge") || "60", 10);

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
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
