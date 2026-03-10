/**
 * GET /api/org/audit-log
 * Query org audit log entries with cursor pagination.
 * Used by "Recently Changed" filter and other consumers.
 *
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";

export type OrgAuditLogEntryResponse = {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    setWorkspaceContext(workspaceId);

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") ?? undefined;
    const entityId = searchParams.get("entityId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const actorId = searchParams.get("actorId") ?? undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const cursorParam = searchParams.get("cursor") ?? undefined;

    const baseWhere: {
      workspaceId: string;
      entityType?: string;
      entityId?: string;
      action?: string;
      actorUserId?: string;
    } = { workspaceId };
    if (entityType) baseWhere.entityType = entityType;
    if (entityId) baseWhere.entityId = entityId;
    if (action) baseWhere.action = action;
    if (actorId) baseWhere.actorUserId = actorId;

    // Decode cursor for pagination (opaque: { createdAt, id })
    let cursorDecoded: { createdAt: string; id: string } | null = null;
    if (cursorParam) {
      try {
        cursorDecoded = JSON.parse(
          Buffer.from(cursorParam, "base64url").toString("utf8")
        ) as { createdAt: string; id: string };
      } catch {
        // Invalid cursor - ignore, start from beginning
      }
    }

    const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const where = cursorDecoded
      ? {
          ...baseWhere,
          OR: [
            { createdAt: { lt: new Date(cursorDecoded.createdAt) } },
            {
              createdAt: new Date(cursorDecoded.createdAt),
              id: { lt: cursorDecoded.id },
            },
          ],
        }
      : baseWhere;

    const logs = await prisma.orgAuditLog.findMany({
      where,
      select: {
        id: true,
        workspaceId: true,
        entityType: true,
        entityId: true,
        action: true,
        actorUserId: true,
        oldValues: true,
        newValues: true,
        metadata: true,
        createdAt: true,
      },
      orderBy,
      take: limit + 1,
    });

    const hasMore = logs.length > limit;
    const entries = logs.slice(0, limit);

    const nextCursor = hasMore && entries.length > 0
      ? Buffer.from(
          JSON.stringify({
            createdAt: entries[entries.length - 1]!.createdAt.toISOString(),
            id: entries[entries.length - 1]!.id,
          }),
          "utf8"
        ).toString("base64url")
      : undefined;

    const response: OrgAuditLogEntryResponse[] = entries.map((log) => ({
      id: log.id,
      workspaceId: log.workspaceId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      actorUserId: log.actorUserId,
      oldValues: log.oldValues as Record<string, unknown> | null,
      newValues: log.newValues as Record<string, unknown> | null,
      metadata: log.metadata as Record<string, unknown> | null,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      entries: response,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
