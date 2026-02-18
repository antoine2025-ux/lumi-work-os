import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-loopbrain/relations-debug
 *
 * Dev-only endpoint to inspect a single ContextItem for Org entities,
 * returning the stored ContextObject + relations.
 *
 * Query params:
 * - contextId: string (required) – e.g. "person:<id>", "team:<id>", "department:<id>"
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        error: "Org relations debug is not available in production.",
      },
      { status: 404 }
    );
  }

  try {
    const url = new URL(request.url);
    const contextId = url.searchParams.get("contextId");

    if (!contextId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required query parameter: contextId",
        },
        { status: 400 }
      );
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspace" },
        { status: 400 }
      );
    }

    const item = await prisma.contextItem.findFirst({
      where: {
        workspaceId,
        contextId,
      },
      select: {
        id: true,
        contextId: true,
        workspaceId: true,
        type: true,
        title: true,
        summary: true,
        data: true,
        updatedAt: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          ok: false,
          error: `No ContextItem found for contextId="${contextId}" in this workspace.`,
        },
        { status: 404 }
      );
    }

    const data = item.data as any;
    const relations = Array.isArray(data?.relations) ? data.relations : [];

    return NextResponse.json(
      {
        ok: true,
        item: {
          ...item,
          updatedAt: item.updatedAt.toISOString(),
        },
        contextObject: data,
        relations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[dev/org-loopbrain/relations-debug] Failed to load Org relations debug",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Org relations debug.",
      },
      { status: 500 }
    );
  }
}

