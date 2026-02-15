/**
 * GET /api/org/audit
 * Query org audit logs (only critical fields: ownerId, managerId, departmentId).
 * NOT full snapshots - returns only logged fields for readability.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors"

export type OrgAuditLogEntry = {
  id: string;
  workspaceId: string;
  userId: string;
  actorUserId: string | null;
  action: string;
  event: string | null;
  entityType: string;
  entityId: string;
  oldValues: {
    ownerId?: string | null;
    managerId?: string | null;
    departmentId?: string | null;
  } | null;
  newValues: {
    ownerId?: string | null;
    managerId?: string | null;
    departmentId?: string | null;
  } | null;
  createdAt: string;
};

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (admin-only for audit logs)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"], // Audit logs are admin-only
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse query params
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Step 5: Query audit logs (only critical fields, NOT full snapshots)
    const where: any = {
      workspaceId,
    };

    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }

    const [logs, total] = await Promise.all([
      prisma.orgAuditLog.findMany({
        where,
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          actorUserId: true,
          action: true,
          event: true,
          entityType: true,
          entityId: true,
          oldValues: true, // Only critical fields (ownerId, managerId, departmentId)
          newValues: true, // Only critical fields (ownerId, managerId, departmentId)
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 500), // Cap at 500
        skip: offset,
      }),
      prisma.orgAuditLog.count({ where }),
    ]);

    // Format response (only logged fields, NOT full snapshots)
    const entries: OrgAuditLogEntry[] = logs.map(log => ({
      id: log.id,
      workspaceId: log.workspaceId,
      userId: log.userId,
      actorUserId: log.actorUserId,
      action: log.action,
      event: log.event,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValues: log.oldValues as OrgAuditLogEntry["oldValues"],
      newValues: log.newValues as OrgAuditLogEntry["newValues"],
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      entries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    return handleApiError(error, request)
  }
}
