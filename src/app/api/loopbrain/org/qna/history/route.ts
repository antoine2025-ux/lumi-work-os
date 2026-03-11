import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const url = new URL(request.url);
    const locationParam = url.searchParams.get("location") || "all";
    const daysParam = url.searchParams.get("days");
    const limitParam = url.searchParams.get("limit");

    const days = daysParam ? parseInt(daysParam, 10) : 7; // default 7 days
    const limitRaw = limitParam ? parseInt(limitParam, 10) : 20; // default 20
    const limit = Number.isNaN(limitRaw) ? 20 : Math.min(limitRaw, 50);

    const where: { workspaceId: string; location?: string; createdAt?: { gte: Date } } = { workspaceId };

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
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

