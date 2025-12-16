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
 * Convenience helper: upsert many ContextObjects in sequence.
 * For now we keep it simple (no transaction batching), but we can
 * optimize later if needed.
 */
export async function upsertContextItems(
  contexts: BaseContextObject[]
) {
  const results = [];
  for (const ctx of contexts) {
    const item = await upsertContextItem(ctx);
    results.push(item);
  }
  return results;
}

