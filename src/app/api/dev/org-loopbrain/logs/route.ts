import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-loopbrain/logs
 *
 * Returns the last 20 Org Loopbrain query logs for the current workspace.
 * Dev-only utility.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Org Loopbrain logs are not available in production." },
      { status: 404 }
    );
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();

    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const logs = await prisma.orgLoopbrainQueryLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        question: true,
        answerPreview: true,
        contextItemsCount: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        workspaceId,
        count: logs.length,
        logs,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[dev/org-loopbrain/logs] Failed to fetch logs", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch Org Loopbrain query logs.",
      },
      { status: 500 }
    );
  }
}

