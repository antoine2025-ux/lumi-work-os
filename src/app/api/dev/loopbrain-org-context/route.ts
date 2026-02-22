/**
 * Dev-only endpoint to inspect Loopbrain Org context bundle.
 * 
 * Returns the Org context bundle as read by Loopbrain from ContextStore.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrgContextForLoopbrain } from "@/lib/loopbrain";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development." },
      { status: 404 }
    );
  }

  try {
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
      } catch (_error) {
        return NextResponse.json(
          { error: "workspaceId is required" },
          { status: 400 }
        );
      }
    }

    const bundle = await getOrgContextForLoopbrain(workspaceId);

    // Build a summary for easier inspection
    const summary = {
      org: bundle.org
        ? {
            id: bundle.org.id,
            type: bundle.org.type,
            title: bundle.org.title,
            summary: bundle.org.summary.substring(0, 200),
            tags: bundle.org.tags,
            relationsCount: bundle.org.relations.length,
          }
        : null,
      related: {
        total: bundle.related.length,
        byType: {
          person: bundle.related.filter((ctx) => ctx.type === "person").length,
          team: bundle.related.filter((ctx) => ctx.type === "team").length,
          department: bundle.related.filter((ctx) => ctx.type === "department")
            .length,
          role: bundle.related.filter((ctx) => ctx.type === "role").length,
        },
        samples: bundle.related.slice(0, 5).map((ctx) => ({
          id: ctx.id,
          type: ctx.type,
          title: ctx.title,
          relationsCount: ctx.relations.length,
        })),
      },
      byId: {
        total: Object.keys(bundle.byId).length,
        sampleIds: Object.keys(bundle.byId).slice(0, 10),
      },
    };

    return NextResponse.json(
      {
        ok: true,
        bundle: {
          org: bundle.org,
          related: bundle.related,
          byId: bundle.byId,
        },
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Loopbrain] Failed to get org context", { error });
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

