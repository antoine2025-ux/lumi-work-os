/**
 * Org Context Diagnostics API
 * 
 * Internal endpoint to inspect Org → ContextStore health.
 * Returns counts, samples, and health issues for a workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrgContextDiagnostics } from "@/lib/org/org-context-service";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(req: NextRequest) {
  try {
    // Get workspaceId from query params or current workspace
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    let workspaceId: string;

    if (workspaceIdParam) {
      workspaceId = workspaceIdParam;
    } else {
      // Fallback to current workspace if no param provided
      try {
        const currentWorkspaceId = await getCurrentWorkspaceId(req);
        if (!currentWorkspaceId) {
          return NextResponse.json(
            { error: "workspaceId is required" },
            { status: 400 }
          );
        }
        workspaceId = currentWorkspaceId;
      } catch (error) {
        return NextResponse.json(
          { error: "workspaceId is required" },
          { status: 400 }
        );
      }
    }

    const diagnostics = await getOrgContextDiagnostics(workspaceId);

    return NextResponse.json({ ok: true, diagnostics }, { status: 200 });
  } catch (error) {
    console.error("[OrgContext] Diagnostics failed", { error });
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

