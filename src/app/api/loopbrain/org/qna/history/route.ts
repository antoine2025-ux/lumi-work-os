import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId(request);

    const url = new URL(request.url);
    const locationParam = url.searchParams.get("location") || "all";
    const daysParam = url.searchParams.get("days");
    const limitParam = url.searchParams.get("limit");

    const days = daysParam ? parseInt(daysParam, 10) : 7; // default 7 days
    const limitRaw = limitParam ? parseInt(limitParam, 10) : 20; // default 20
    const limit = Number.isNaN(limitRaw) ? 20 : Math.min(limitRaw, 50);

    const where: any = { workspaceId };

    if (locationParam && locationParam !== "all") {
      where.location = locationParam;
    }

    if (!Number.isNaN(days) && days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }

    const logs = await prisma.orgQnaLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        question: log.question,
        location: log.location,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to load Org Q&A history", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load history" },
      { status: 500 }
    );
  }
}

