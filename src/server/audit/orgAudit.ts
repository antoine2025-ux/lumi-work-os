import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type OrgAuditEventType =
  | "ORG_CREATED"
  | "ORG_DELETED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED"
  | "ORG_OWNERSHIP_TRANSFERRED";

type LogOrgAuditEventParams = {
  workspaceId: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  event: OrgAuditEventType;
  metadata?: Record<string, unknown>;
};

type PrismaLikeClient = {
  orgAuditLog: {
    create: (args: Prisma.OrgAuditLogCreateArgs) => Promise<unknown>;
  };
};

export async function logOrgAuditEvent(
  client: PrismaLikeClient,
  { workspaceId, actorUserId, targetUserId, event, metadata }: LogOrgAuditEventParams
) {
  try {
    // userId is required in the existing model, use actorUserId or targetUserId
    const userId = actorUserId || targetUserId;
    if (!userId) {
      console.warn("[ORG_AUDIT_LOG_WARNING] No actorUserId or targetUserId provided");
      return;
    }

    await client.orgAuditLog.create({
      data: {
        workspaceId,
        userId, // Required field for backward compatibility
        actorUserId: actorUserId ?? null,
        targetUserId: targetUserId ?? null,
        event,
        metadata: (metadata ?? {}) as unknown as Prisma.InputJsonValue,
        // Set action and entityType for backward compatibility
        action: event,
        entityType: "WORKSPACE",
        entityId: workspaceId,
      },
    });
  } catch (err: unknown) {
    // Audit logging must never break primary flows.
    console.error("[ORG_AUDIT_LOG_ERROR]", err);
  }
}

export async function logOrgAuditEventStandalone(
  params: LogOrgAuditEventParams
) {
  return logOrgAuditEvent(prisma, params);
}

