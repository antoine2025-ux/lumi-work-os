/**
 * Org Audit Log Helper
 *
 * Fire-and-forget logging for org mutations. Never blocks or throws.
 * Use logOrgAudit() after successful mutations to record changes.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type OrgAuditEntityType =
  | "PERSON"
  | "TEAM"
  | "DEPARTMENT"
  | "ROLE"
  | "POSITION"
  | "MANAGER_LINK"
  | "INVITATION"
  | "CAPACITY"
  | "CUSTOM_ROLE"
  | "CAPACITY_CONTRACT"
  | "ALLOCATION";

export type OrgAuditAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "ARCHIVED"
  | "RESTORED"
  | "ASSIGNED"
  | "UNASSIGNED";

export interface OrgAuditEntry {
  workspaceId: string;
  entityType: OrgAuditEntityType;
  entityId: string;
  entityName?: string;
  action: OrgAuditAction;
  actorId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * Log an org audit entry. Fire-and-forget: errors are logged but never thrown.
 * Schema requires userId; we use actorId for both userId and actorUserId.
 */
export async function logOrgAudit(entry: OrgAuditEntry): Promise<void> {
  try {
    const { changes, metadata, entityName, ...rest } = entry;

    // Flatten changes to oldValues/newValues format
    let oldValues: Prisma.InputJsonValue | undefined;
    let newValues: Prisma.InputJsonValue | undefined;
    if (changes && Object.keys(changes).length > 0) {
      oldValues = Object.fromEntries(
        Object.entries(changes).map(([k, v]) => [k, v.from])
      ) as Prisma.InputJsonValue;
      newValues = Object.fromEntries(
        Object.entries(changes).map(([k, v]) => [k, v.to])
      ) as Prisma.InputJsonValue;
    }

    const meta: Record<string, unknown> = { ...metadata };
    if (entityName) {
      meta.entityName = entityName;
    }

    await prisma.orgAuditLog.create({
      data: {
        workspaceId: rest.workspaceId,
        userId: rest.actorId,
        actorUserId: rest.actorId,
        action: rest.action,
        entityType: rest.entityType,
        entityId: rest.entityId,
        oldValues: oldValues ?? Prisma.JsonNull,
        newValues: newValues ?? Prisma.JsonNull,
        metadata: Object.keys(meta).length > 0 ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull,
        event: null,
      },
    });
  } catch (error: unknown) {
    console.error("[logOrgAudit] Failed to write audit log (non-fatal):", error);
    // Never throw - audit logging must not break primary flows
  }
}

/**
 * Log multiple org audit entries in a single batch operation.
 * Use this for bulk operations (people/bulk, import/apply) to avoid 50+ individual writes.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function logOrgAuditBatch(entries: OrgAuditEntry[]): Promise<void> {
  if (entries.length === 0) return;

  try {
    const data = entries.map((entry) => {
      const { changes, metadata, entityName, ...rest } = entry;

      // Flatten changes to oldValues/newValues format
      let oldValues: Prisma.InputJsonValue | undefined;
      let newValues: Prisma.InputJsonValue | undefined;
      if (changes && Object.keys(changes).length > 0) {
        oldValues = Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, v.from])
        ) as Prisma.InputJsonValue;
        newValues = Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, v.to])
        ) as Prisma.InputJsonValue;
      }

      const meta: Record<string, unknown> = { ...metadata };
      if (entityName) {
        meta.entityName = entityName;
      }

      return {
        workspaceId: rest.workspaceId,
        userId: rest.actorId,
        actorUserId: rest.actorId,
        action: rest.action,
        entityType: rest.entityType,
        entityId: rest.entityId,
        oldValues: oldValues ?? Prisma.JsonNull,
        newValues: newValues ?? Prisma.JsonNull,
        metadata: Object.keys(meta).length > 0 ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull,
        event: null,
      };
    });

    await prisma.orgAuditLog.createMany({ data });
  } catch (error: unknown) {
    console.error(`[logOrgAuditBatch] Failed to write ${entries.length} audit logs (non-fatal):`, error);
    // Never throw - audit logging must not break primary flows
  }
}
