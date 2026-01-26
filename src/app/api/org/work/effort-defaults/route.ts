/**
 * GET/PUT /api/org/work/effort-defaults
 * 
 * Manage workspace effort defaults for T-shirt to hours conversion.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import {
  getOrCreateWorkspaceEffortDefaults,
  updateWorkspaceEffortDefaults,
  serializeEffortDefaults,
  DEFAULT_EFFORT_HOURS,
} from "@/lib/org/work/effortDefaults";
import { getWorkRequestResponseMeta } from "@/lib/org/work/types";

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

    // Step 4: Get or create defaults
    const defaults = await getOrCreateWorkspaceEffortDefaults(workspaceId);

    return NextResponse.json({
      ok: true,
      defaults: {
        XS: defaults.xsHours,
        S: defaults.sHours,
        M: defaults.mHours,
        L: defaults.lHours,
        XL: defaults.xlHours,
      },
      codeDefaults: DEFAULT_EFFORT_HOURS,
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/work/effort-defaults] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (require ADMIN for updating defaults)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();

    // Validate all values are positive numbers if provided
    const updates: Record<string, number> = {};
    const fields = ["xsHours", "sHours", "mHours", "lHours", "xlHours"] as const;
    const fieldMap: Record<string, string> = {
      XS: "xsHours",
      S: "sHours",
      M: "mHours",
      L: "lHours",
      XL: "xlHours",
    };

    for (const [key, field] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        const value = body[key];
        if (typeof value !== "number" || value <= 0) {
          return NextResponse.json(
            { error: `${key} must be a positive number` },
            { status: 400 }
          );
        }
        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update. Provide XS, S, M, L, or XL." },
        { status: 400 }
      );
    }

    // Step 5: Update defaults
    const defaults = await updateWorkspaceEffortDefaults(workspaceId, updates);

    return NextResponse.json({
      ok: true,
      defaults: serializeEffortDefaults(defaults),
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[PUT /api/org/work/effort-defaults] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
