import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-loopbrain/context-snapshot
 *
 * Returns a small snapshot of Org-related ContextItems for the current workspace:
 * - counts by type: person, team, department, role, org
 * - total Org context items
 * - last updatedAt timestamps
 *
 * Dev-only utility: in production this should either be disabled or limited.
 */
export async function GET() {
  // Restrict in production – keep this as a dev-only diagnostic
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Org context snapshot is not available in production." },
      { status: 404 }
    );
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspace" },
        { status: 400 }
      );
    }

    // Fetch Org-related context items only
    const items = await prisma.contextItem.findMany({
      where: {
        workspaceId,
        type: {
          in: ["person", "team", "department", "role", "org"],
        },
      },
      select: {
        id: true,
        type: true,
        updatedAt: true,
      },
    });

    const counts: Record<string, number> = {
      person: 0,
      team: 0,
      department: 0,
      role: 0,
      org: 0,
    };

    let latestUpdatedAt: Date | null = null;

    for (const item of items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;

      if (!latestUpdatedAt || item.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = item.updatedAt;
      }
    }

    const total = items.length;

    return NextResponse.json(
      {
        ok: true,
        workspaceId,
        total,
        counts,
        latestUpdatedAt: latestUpdatedAt ? latestUpdatedAt.toISOString() : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[dev/org-loopbrain/context-snapshot] Failed to compute Org context snapshot",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to compute Org context snapshot.",
      },
      { status: 500 }
    );
  }
}

