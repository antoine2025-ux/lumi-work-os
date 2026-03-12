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
import { handleApiError } from "@/lib/api-errors";
import {
  getOrCreateWorkspaceEffortDefaults,
  updateWorkspaceEffortDefaults,
  serializeEffortDefaults,
  DEFAULT_EFFORT_HOURS,
} from "@/lib/org/work/effortDefaults";
import { getWorkRequestResponseMeta } from "@/lib/org/work/types";
import { UpdateEffortDefaultsSchema } from "@/lib/validations/org";

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
    return handleApiError(error, request);
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
    const body = UpdateEffortDefaultsSchema.parse(await request.json());

    const updates: Record<string, number> = {};
    const fieldMap: Record<string, string> = {
      XS: "xsHours",
      S: "sHours",
      M: "mHours",
      L: "lHours",
      XL: "xlHours",
    };

    for (const [key, field] of Object.entries(fieldMap)) {
      if (body[key as keyof typeof body] !== undefined) {
        updates[field] = body[key as keyof typeof body]!;
      }
    }

    // Step 5: Update defaults
    const defaults = await updateWorkspaceEffortDefaults(workspaceId, updates);

    return NextResponse.json({
      ok: true,
      defaults: serializeEffortDefaults(defaults),
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
