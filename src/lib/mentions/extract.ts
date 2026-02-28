/**
 * Extract @mention nodes from TipTap/ProseMirror JSON content.
 * Returns deduplicated list of mentioned person IDs (userId) for notifications.
 */

import type { JSONContent } from "@tiptap/core"

export interface ExtractedMention {
  personId: string
  name: string
}

/**
 * Walks the ProseMirror JSON tree and extracts all mention nodes.
 * Returns deduplicated list by personId (userId).
 */
export function extractMentions(
  content: JSONContent | null | undefined
): ExtractedMention[] {
  if (!content) return []

  const seen = new Set<string>()
  const result: ExtractedMention[] = []

  function walk(node: JSONContent) {
    if (node.type === "mention" && node.attrs?.id) {
      const id = String(node.attrs.id)
      const label = node.attrs.label != null ? String(node.attrs.label) : id
      if (!seen.has(id)) {
        seen.add(id)
        result.push({ personId: id, name: label })
      }
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child)
      }
    }
  }

  walk(content)
  return result
}
