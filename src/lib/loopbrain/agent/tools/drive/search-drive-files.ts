/**
 * Loopbrain Tool: searchDriveFiles
 *
 * Search Google Drive files by name, content, or metadata.
 * Read-only — does not require confirmation.
 */

import { z } from 'zod'
import type { LoopbrainTool, AgentContext, ToolResult } from '../../types'
import { getDriveClientForUser, DriveNotConnectedError } from '@/lib/integrations/drive/client'
import { searchDriveFiles } from '@/lib/integrations/drive/search'
import { DriveRateLimitError } from '@/lib/integrations/drive/retry'
import { logger } from '@/lib/logger'

const SearchDriveFilesSchema = z.object({
  query: z.string().min(1).describe('Search query (supports Drive search syntax)'),
  mimeType: z
    .string()
    .optional()
    .describe('Filter by MIME type (e.g., "application/vnd.google-apps.document")'),
  folderId: z.string().optional().describe('Search within a specific folder'),
  maxResults: z.preprocess(
    (v) => { if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : v } return v },
    z.number().int().min(1).max(50).optional().default(10),
  ).describe('Maximum number of results (default 10, max 50)'),
})

export const searchDriveFilesTool: LoopbrainTool = {
  name: 'searchDriveFiles',
  description:
    'Search Google Drive for files by name or content. Use when the user asks to search Drive, find meeting notes, docs, or a file in Google Drive. Returns file IDs, names, links, types, and modification dates. Use readDriveDocument next to get file content.',
  category: 'drive',
  parameters: SearchDriveFilesSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'MEMBER' },

  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = SearchDriveFilesSchema.parse(params)

    try {
      const client = await getDriveClientForUser(context.userId, context.workspaceId)

      const files = await searchDriveFiles(client, p.query, {
        mimeType: p.mimeType,
        folderId: p.folderId,
        maxResults: p.maxResults,
      })

      return {
        success: true,
        data: { files: files as unknown as Record<string, unknown>[] },
        humanReadable:
          files.length > 0
            ? `Found ${files.length} file(s) matching "${p.query}"`
            : `No files found matching "${p.query}"`,
      }
    } catch (err) {
      if (err instanceof DriveNotConnectedError) {
        return {
          success: false,
          error: 'DRIVE_NOT_CONNECTED',
          humanReadable: err.message,
        }
      }
      if (err instanceof DriveRateLimitError) {
        return {
          success: false,
          error: 'RATE_LIMITED',
          humanReadable: err.message,
        }
      }
      logger.error('searchDriveFiles tool failed', { err, context })
      return {
        success: false,
        error: String(err),
        humanReadable: 'Failed to search Google Drive',
      }
    }
  },
}
