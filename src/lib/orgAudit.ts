import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";
import { NextRequest } from "next/server";

export type OrgAuditAction =
  | "INVITE_CREATED"
  | "INVITE_REVOKED"
  | "TEAM_CREATED"
  | "DEPARTMENT_CREATED"
  | "ROLE_CREATED"
  | "MEMBER_CUSTOM_ROLE_UPDATED";

export type OrgAuditTargetType =
  | "INVITE"
  | "TEAM"
  | "DEPARTMENT"
  | "ROLE"
  | "MEMBER";

type AuditMeta = Prisma.JsonValue;

/**
 * Append a new audit log row for an org.
 * This is best-effort; if logging fails, we swallow the error so the primary
 * mutation doesn't break.
 * 
 * Adapts to existing OrgAuditLog schema:
 * - workspaceId (orgId)
 * - userId (required, uses actorUserId if available)
 * - actorUserId (optional, the actual actor)
 * - entityType (targetType)
 * - entityId (targetId)
 * - metadata (meta)
 */
export async function logOrgAudit(
  params: {
    orgId: string;
    action: OrgAuditAction;
    targetType?: OrgAuditTargetType;
    targetId?: string | null;
    meta?: AuditMeta;
  },
  request?: NextRequest
) {
  try {
    const actorUserId = await getCurrentUserId(request);

    // Get a userId for the required userId field (use actorUserId or a system user)
    // For now, use actorUserId if available, otherwise we'll need to handle this
    if (!actorUserId) {
      console.warn("[org-audit-log] No actor user ID available, skipping audit log");
      return;
    }

    await prisma.orgAuditLog.create({
      data: {
        workspaceId: params.orgId,
        userId: actorUserId, // Required field
        actorUserId: actorUserId, // Optional field for clarity
        entityType: params.targetType ?? "UNKNOWN", // Required field, use fallback
        entityId: params.targetId ?? "unknown", // Required field, use fallback
        action: params.action,
        metadata: params.meta ?? undefined,
        // Omit oldValues and newValues to use schema defaults
        oldValues: undefined,
        newValues: undefined,
      },
    });
  } catch (error) {
    console.error("[org-audit-log] Failed to write audit log", error);
    // Intentionally swallow error – audit log is non-critical.
  }
}

/**
 * Fetch a small number of recent audit entries for an org.
 * Handles missing actorUserId column gracefully by only using the user relation.
 */
export async function listOrgAuditForOrg(orgId: string, limit = 20) {
  try {
    // Try to query with user relation only (actorUserId column may not exist yet)
    const logs = await prisma.orgAuditLog.findMany({
      where: { workspaceId: orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        // Only select user relation, avoid actor relation that depends on actorUserId
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return logs;
  } catch (error: unknown) {
    // Handle case where actorUserId column or relation doesn't exist yet (before migrations)
    const err = error as { message?: string; code?: string } | null;
    const errorMessage = err?.message || '';
    const errorCode = err?.code || '';
    
    const isColumnMissingError =
      errorCode === 'P2011' || // Invalid value provided
      errorCode === 'P2001' || // Record does not exist
      errorCode === 'P2025' || // Record not found
      errorCode === 'P2019' || // Record required for a relation
      errorMessage.includes('actorUserId') ||
      errorMessage.includes('actor') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('Unknown column') ||
      (errorMessage.includes('column') && errorMessage.includes('not exist'));

    if (isColumnMissingError) {
      // Fallback: query without any relations, just return basic audit log data
      try {
        const logs = await prisma.orgAuditLog.findMany({
          where: { workspaceId: orgId },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            workspaceId: true,
            userId: true,
            action: true,
            entityType: true,
            entityId: true,
            metadata: true,
            createdAt: true,
            // Don't include any relations to avoid schema validation issues
          },
        });
        // Manually fetch user data if userId exists
        const logsWithUsers = await Promise.all(
          logs.map(async (log) => {
            if (log.userId) {
              try {
                const user = await prisma.user.findUnique({
                  where: { id: log.userId },
                  select: { id: true, name: true, email: true },
                });
                return { ...log, user };
              } catch {
                return { ...log, user: null };
              }
            }
            return { ...log, user: null };
          })
        );
        return logsWithUsers;
      } catch (fallbackError: unknown) {
        console.error("[listOrgAuditForOrg] Fallback query also failed:", fallbackError);
        return [];
      }
    }
    
    // If it's a different error, log and return empty array
    console.error("[listOrgAuditForOrg] Error loading audit logs:", error);
    return [];
  }
}

