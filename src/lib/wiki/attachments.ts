/**
 * Wiki attachment tracking utilities
 * Extracts upload URLs from editor content and links orphan attachments to pages
 */

import { JSONContent } from '@tiptap/core'
import { prisma } from '@/lib/db'

/**
 * Recursively extract image src URLs and link href URLs from TipTap JSON content
 */
export function extractUploadUrlsFromContent(content: JSONContent | null | undefined): string[] {
  const urls: string[] = []

  const traverse = (node: JSONContent): void => {
    if (node.type === 'image' && node.attrs?.src) {
      const src = node.attrs.src as string
      if (src && typeof src === 'string') {
        urls.push(src)
      }
    }

    if (node.marks && Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (mark.type === 'link' && mark.attrs?.href) {
          const href = mark.attrs.href as string
          if (href && typeof href === 'string') {
            urls.push(href)
          }
        }
      }
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child)
      }
    }
  }

  if (content) {
    traverse(content)
  }

  return [...new Set(urls)]
}

/**
 * Link orphan WikiAttachment records (pageId is null) to the given page when their fileUrl appears in the content
 */
export async function linkAttachmentsToPage(
  workspaceId: string,
  pageId: string,
  urls: string[]
): Promise<void> {
  if (urls.length === 0) return

  await prisma.wikiAttachment.updateMany({
    where: {
      workspaceId,
      fileUrl: { in: urls },
      OR: [{ pageId: null }, { pageId }],
    },
    data: { pageId },
  })
}
