/**
 * Loopbrain integration for Org mutations.
 * 
 * Emits context objects for Loopbrain indexing when Org entities change.
 * IMPORTANT: Every Org mutation MUST call emitOrgContextObject.
 */

import { prisma } from "@/lib/db";
import { saveContextItem } from "@/lib/loopbrain/store/context-repository";
import { embedContextItem } from "@/lib/loopbrain/embedding-service";
import { ContextType } from "@/lib/loopbrain/context-types";
import type { BaseContext } from "@/lib/loopbrain/context-types";

export type OrgContextAction =
  | "org.person.created"
  | "org.person.updated"
  | "org.person.title.updated"
  | "org.person.manager_set"
  | "org.person.team.updated"
  | "org.ownership.assigned"
  | "org.availability.updated"
  | "org.department.created"
  | "org.department.owner_set"
  | "org.team.created"
  | "org.team.owner_set"
  | "org.team.member_added"
  | "org.team.member_removed"
  | "org.intelligence.snapshot_created";

export type OrgContextObjectInput = {
  workspaceId: string;
  actorUserId: string;
  action: OrgContextAction;
  entity: { type: "person" | "team" | "department" | "ownership"; id: string };
  payload: Record<string, any>;
};

/**
 * Persist a ContextObject for Loopbrain and trigger indexing (non-blocking).
 * 
 * This creates a minimal context object that represents the mutation event.
 * The org context bundle will be rebuilt on next access via buildOrgLoopbrainContextBundleForWorkspace.
 */
export async function emitOrgContextObject(input: OrgContextObjectInput): Promise<string> {
  // Build a minimal BaseContext object for this mutation
  // Use a stable ID format: org:{entityType}:{entityId}
  const contextId = `org:${input.entity.type}:${input.entity.id}`;
  
  const context: BaseContext = {
    type: ContextType.ORG,
    id: contextId,
    workspaceId: input.workspaceId,
    timestamp: new Date().toISOString(),
    metadata: {
      action: input.action,
      actorUserId: input.actorUserId,
      entityType: input.entity.type,
      entityId: input.entity.id,
      payload: input.payload,
    },
  };

  // Persist to ContextItem (this is durable)
  // saveContextItem expects a ContextObject that extends BaseContext
  // BaseContext has type, id, workspaceId, timestamp, and optional metadata
  const saved = await saveContextItem(context as any);

  // Trigger indexing non-blocking (don't await - fire and forget)
  // Use setImmediate to ensure it runs after the current request completes
  setImmediate(async () => {
    try {
      await embedContextItem({
        workspaceId: input.workspaceId,
        contextItemId: saved.id,
      });
    } catch (error) {
      // Log but don't fail - indexing is non-blocking
      console.error("[emitOrgContextObject] Failed to trigger indexing:", error);
    }
  });

  return saved.id;
}

