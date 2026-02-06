/**
 * GET /api/org/snapshot
 *
 * Returns OrgSemanticSnapshotV0 — a machine-readable snapshot of org state
 * for Loopbrain consumption.
 *
 * Access: MEMBER+ (read-only; no sensitive data beyond what Org pages expose)
 * Snapshot is a machine contract; UI must display only, never reinterpret.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { buildOrgSemanticSnapshotV0 } from "@/lib/org/snapshot/buildOrgSemanticSnapshotV0";
import { validateSnapshotAgainstSchema } from "@/lib/org/snapshot/validateAgainstSchema";
import { validateSnapshotV0 } from "@/lib/org/snapshot/validateSnapshotV0";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const snapshot = await buildOrgSemanticSnapshotV0({ workspaceId });

    let warnings: string[] = [];
    if (process.env.NODE_ENV === "development") {
      const schemaValidation = validateSnapshotAgainstSchema(snapshot);
      if (!schemaValidation.ok) {
        console.warn("[GET /api/org/snapshot] Schema validation failed:", schemaValidation.errors);
        warnings = schemaValidation.errors;
      }
      if (schemaValidation.ok) {
        const manualValidation = validateSnapshotV0(snapshot);
        if (!manualValidation.ok) {
          console.warn("[GET /api/org/snapshot] Manual validation failed:", manualValidation.errors);
          warnings = [...warnings, ...manualValidation.errors];
        }
      }
    }

    const headers = new Headers();
    headers.set("Cache-Control", "no-store");

    return NextResponse.json(
      warnings.length > 0 ? { ok: true, data: snapshot, warnings } : { ok: true, data: snapshot },
      { headers }
    );
  } catch (error: unknown) {
    console.error("[GET /api/org/snapshot] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load org snapshot",
      },
      { status: 500 }
    );
  }
}
