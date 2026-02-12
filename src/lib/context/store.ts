// src/lib/context/store.ts

import { prisma } from "@/lib/db";
import type { BaseContextObject } from "./types";

/**
 * Deterministic ContextItem.id generator.
 *
 * We combine workspaceId + type + contextId so that:
 *  - each (workspace, type, contextId) trio is unique
 *  - upserts are idempotent
 */
function makeContextItemId(ctx: BaseContextObject): string {
  return `${ctx.workspaceId}:${ctx.type}:${ctx.contextId}`;
}

/**
 * Upsert a single ContextItem from a BaseContextObject.
 *
 * This does NOT compute embeddings or summaries – it just stores the core
 * context snapshot in the context_items table.
 */
export async function upsertContextItem(
  ctx: BaseContextObject
) {
  const id = makeContextItemId(ctx);

  const { contextId, workspaceId, type, title, summary, data } = ctx;

  const result = await prisma.contextItem.upsert({
    where: { id },
    update: {
      contextId,
      workspaceId,
      type,
      title,
      summary: summary ?? null,
      data,
    },
    create: {
      id,
      contextId,
      workspaceId,
      type,
      title,
      summary: summary ?? null,
      data,
    },
  });

  return result;
}

/**
 * Upsert many ContextObjects in parallel (optimized for performance).
 * Uses Promise.all for concurrent upserts since each operation is independent.
 */
export async function upsertContextItems(
  contexts: BaseContextObject[]
) {
  if (contexts.length === 0) {
    return [];
  }
  
  // Execute all upserts in parallel - they're independent operations
  const results = await Promise.all(
    contexts.map(ctx => upsertContextItem(ctx))
  );
  
  return results;
}

