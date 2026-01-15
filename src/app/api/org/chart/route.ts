/**
 * Org Chart API Route
 * 
 * Phase 4: Returns org chart tree data for visualization
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { buildOrgChartTree, buildOrgChartByDepartment } from "@/lib/org/projections/buildOrgChartTree";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || auth.workspaceId;
    const groupBy = searchParams.get("groupBy"); // "department" or null
    const maxDepth = parseInt(searchParams.get("maxDepth") || "10", 10);
    const includeVacant = searchParams.get("includeVacant") !== "false";
    const rootPositionId = searchParams.get("rootPositionId") || undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify workspace access
    if (workspaceId !== auth.workspaceId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error("Error fetching org chart:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch org chart" },
      { status: 500 }
    );
  }
}

