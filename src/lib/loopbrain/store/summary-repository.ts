/**
 * Summary Repository
 * 
 * Data access layer for ContextSummary storage and retrieval.
 * Handles pre-computed LLM-generated summaries for ContextItem instances.
 * 
 * Rules:
 * - No business logic
 * - No summary generation
 * - Strong typing only
 * - Handle nulls gracefully with fallbacks
 * - Workspace scoping enforced via workspaceId parameter
 */

import { prisma } from '@/lib/db'

/**
 * Save a summary for a context item
 * 
 * @param contextItemId - The ContextItem ID
 * @param summary - The text summary
 * @param workspaceId - The workspace ID for scoping
 */
export async function saveSummary(
  contextItemId: string,
  summary: string,
  workspaceId: string
): Promise<void> {
  // Upsert summary (update if exists, create if not)
  await prisma.contextSummary.upsert({
    where: {
      contextItemId
    },
    update: {
      summary,
      workspaceId,
      updatedAt: new Date()
    },
    create: {
      contextItemId,
      summary,
      workspaceId,
      updatedAt: new Date(),
      createdAt: new Date()
    }
  })

  // Also update the summary field in ContextItem for quick access
  await prisma.contextItem.updateMany({
    where: {
      id: contextItemId,
      workspaceId // Ensure workspace scoping
    },
    data: {
      summary
    }
  })
}

/**
 * Get summary for a context item
 * 
 * @param contextItemId - The ContextItem ID
 * @returns The summary text or null if not found
 */
export async function getSummary(
  contextItemId: string
): Promise<string | null> {
  const summaryRecord = await prisma.contextSummary.findUnique({
    where: {
      contextItemId
    },
    select: {
      summary: true
    }
  })

  if (!summaryRecord) {
    return null
  }

  return summaryRecord.summary
}

/**
 * Get summary with graceful fallback
 * 
 * If summary doesn't exist, tries to get it from ContextItem.summary field
 * 
 * @param contextItemId - The ContextItem ID
 * @returns The summary text or null if not found
 */
export async function getSummaryWithFallback(
  contextItemId: string
): Promise<string | null> {
  // Try ContextSummary first
  const summary = await getSummary(contextItemId)
  if (summary) {
    return summary
  }

  // Fallback to ContextItem.summary field
  const contextItem = await prisma.contextItem.findUnique({
    where: {
      id: contextItemId
    },
    select: {
      summary: true
    }
  })

  return contextItem?.summary || null
}

/**
 * Delete summary for a context item
 * 
 * @param contextItemId - The ContextItem ID
 * @param workspaceId - The workspace ID for scoping
 */
export async function deleteSummary(
  contextItemId: string,
  workspaceId: string
): Promise<void> {
  await prisma.contextSummary.deleteMany({
    where: {
      contextItemId,
      workspaceId // Ensure workspace scoping
    }
  })

  // Also clear summary field in ContextItem
  await prisma.contextItem.updateMany({
    where: {
      id: contextItemId,
      workspaceId // Ensure workspace scoping
    },
    data: {
      summary: null
    }
  })
}




