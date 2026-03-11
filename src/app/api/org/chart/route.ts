/**
 * Org Chart API Route
 * 
 * Phase 4: Returns org chart tree data for visualization
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { buildOrgChartTree, buildOrgChartByDepartment } from "@/lib/org/projections/buildOrgChartTree";

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get("groupBy"); // "department" or null
    const maxDepth = parseInt(searchParams.get("maxDepth") || "10", 10);
    const includeVacant = searchParams.get("includeVacant") !== "false";
    const rootPositionId = searchParams.get("rootPositionId") || undefined;

    if (groupBy === "department") {
      const data = await buildOrgChartByDepartment(workspaceId);
      return NextResponse.json(data);
    }

    const tree = await buildOrgChartTree(workspaceId, {
      maxDepth,
      includeVacant,
      rootPositionId,
    });

    return NextResponse.json(tree);
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
