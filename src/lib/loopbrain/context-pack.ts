/**
 * Context Packing Helpers
 * 
 * Utilities for packing context objects into prompt budgets.
 * Ensures deterministic behavior via item counts and character limits.
 */

import { ContextObject } from '@/lib/context/context-types'
import { PROMPT_BUDGET, PRIMARY_CONTEXT_BUDGET } from './prompt-budgets'

/**
 * Estimate character count for a value (JSON string length)
 */
export function estimateChars(value: unknown): number {
  if (value === null || value === undefined) {
    return 0
  }
  try {
    return JSON.stringify(value).length
  } catch {
    // Fallback for circular refs or non-serializable
    return String(value).length
  }
}

/**
 * Compact a ContextObject to fit within maxChars
 * 
 * Preserves: id, type, title, tags, status, updatedAt, relations
 * Shortens: summary, trims large metadata keys
 */
export function compactContextObject(
  obj: ContextObject,
  maxChars: number
): ContextObject {
  // Start with required fields
  const compacted: ContextObject = {
    id: obj.id,
    workspaceId: obj.workspaceId,
    type: obj.type,
    title: obj.title,
    summary: obj.summary,
    tags: obj.tags,
    status: obj.status,
    updatedAt: obj.updatedAt,
    relations: obj.relations,
    ownerId: obj.ownerId,
  }

  // Estimate base size
  let currentChars = estimateChars(compacted)

  // If already under limit, return as-is
  if (currentChars <= maxChars) {
    return { ...compacted, metadata: obj.metadata }
  }

  // Shorten summary if needed
  const summaryBudget = Math.max(100, maxChars - currentChars - 200) // Reserve space for metadata
  if (compacted.summary.length > summaryBudget) {
    compacted.summary = compacted.summary.substring(0, summaryBudget - 3) + '...'
    currentChars = estimateChars(compacted)
  }

  // Trim metadata if still over limit
  if (currentChars > maxChars && obj.metadata) {
    const metadata: Record<string, unknown> = {}
    const metadataBudget = maxChars - currentChars
    
    // Keep only essential metadata keys (prioritize small ones)
    const essentialKeys = ['id', 'slug', 'priority', 'dueDate', 'epicId', 'epicTitle']
    for (const key of essentialKeys) {
      if (key in obj.metadata) {
        const value = obj.metadata[key]
        const valueChars = estimateChars(value)
        if (estimateChars(metadata) + valueChars <= metadataBudget) {
          metadata[key] = value
        }
      }
    }
    
    compacted.metadata = Object.keys(metadata).length > 0 ? metadata : undefined
  }

  return compacted
}

/**
 * Options for packing a context section
 */
export interface PackContextSectionOptions {
  /** Maximum number of items */
  maxItems: number
  /** Maximum characters per item */
  maxCharsPerItem: number
  /** Maximum total characters for all items */
  maxTotalChars: number
  /** Optional custom compact function */
  compact?: (item: unknown, maxChars: number) => unknown
}

/**
 * Result of packing a context section
 */
export interface PackContextSectionResult<T> {
  /** Packed items */
  items: T[]
  /** Number of items dropped */
  droppedCount: number
  /** Total characters used */
  totalChars: number
}

/**
 * Pack a context section (cap by item count and char limits)
 * 
 * Stops once maxTotalChars is exceeded.
 */
export function packContextSection<T>(
  items: T[],
  opts: PackContextSectionOptions
): PackContextSectionResult<T> {
  const { maxItems, maxCharsPerItem, maxTotalChars, compact } = opts
  
  let totalChars = 0
  const packed: T[] = []
  let droppedCount = 0

  for (let i = 0; i < items.length && packed.length < maxItems; i++) {
    const item = items[i]
    
    // Compact if function provided
    const processedItem = compact 
      ? (compact(item, maxCharsPerItem) as T)
      : item
    
    // Estimate size
    const itemChars = estimateChars(processedItem)
    
    // Check if adding this item would exceed total budget
    if (totalChars + itemChars > maxTotalChars) {
      droppedCount = items.length - packed.length
      break
    }
    
    // Check per-item limit
    if (itemChars > maxCharsPerItem) {
      // Try compacting if it's a ContextObject
      if (typeof processedItem === 'object' && processedItem !== null && 'type' in processedItem) {
        const compacted = compactContextObject(processedItem as unknown as ContextObject, maxCharsPerItem)
        const compactedChars = estimateChars(compacted)
        if (totalChars + compactedChars <= maxTotalChars) {
          packed.push(compacted as T)
          totalChars += compactedChars
        } else {
          droppedCount = items.length - packed.length
          break
        }
      } else {
        // Skip items that are too large even after compacting
        droppedCount++
        continue
      }
    } else {
      packed.push(processedItem)
      totalChars += itemChars
    }
  }

  // Count remaining items as dropped
  if (packed.length < items.length) {
    droppedCount = items.length - packed.length
  }

  return {
    items: packed,
    droppedCount,
    totalChars,
  }
}

/**
 * Compact primary context content (e.g., wiki page HTML/text)
 * 
 * Keeps: title, excerpt, key metadata, top headings if available
 * Limits content to maxChars
 */
export function compactPrimaryContext(
  content: string,
  maxChars: number = PRIMARY_CONTEXT_BUDGET.maxChars
): string {
  if (content.length <= maxChars) {
    return content
  }

  // Try to preserve structure by keeping first part
  // In future, could extract headings and key sections
  const truncated = content.substring(0, maxChars - 3) + '...'
  return truncated
}

