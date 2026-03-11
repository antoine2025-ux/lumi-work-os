/**
 * Loopbrain Tool: readDriveDocument
 *
 * Read the text content of a Google Drive file.
 * Supports Google Docs, Sheets, text files. Read-only — no confirmation.
 */

import { z } from 'zod'
import type { LoopbrainTool, AgentContext, ToolResult } from '../../types'
import { getDriveClientForUser, DriveNotConnectedError } from '@/lib/integrations/drive/client'
import { readDriveDocument } from '@/lib/integrations/drive/read'
import { logger } from '@/lib/logger'

const ReadDriveDocumentSchema = z.object({
  fileId: z.string().min(1).describe('Google Drive file ID'),
  format: z
    .enum(['text', 'markdown'])
    .optional()
    .default('text')
    .describe('Output format preference'),
})

export const readDriveDocumentTool: LoopbrainTool = {
  name: 'readDriveDocument',
  description:
    'Read the text content of a Google Drive file (Docs, Sheets, meeting notes, etc.). Use after searchDriveFiles when you have a file ID. Supports Google Docs, Sheets (as CSV), and text files.',
  category: 'drive',
  parameters: ReadDriveDocumentSchema,
  requiresConfirmation: false,
  permissions: { minimumRole: 'MEMBER' },

  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = ReadDriveDocumentSchema.parse(params)

    try {
      const client = await getDriveClientForUser(context.userId, context.workspaceId)

      const doc = await readDriveDocument(client, p.fileId, p.format)

      const data: Record<string, unknown> = {
        content: doc.content,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        lastModified: doc.lastModified,
        webViewLink: doc.webViewLink,
      }
      if (doc.truncated) {
        data.truncated = true
        data.warning = 'Content was truncated due to size limits'
      }

      return {
        success: true,
        data,
        humanReadable: doc.truncated
          ? `Read "${doc.fileName}" (truncated — file exceeds size limit)`
          : `Read "${doc.fileName}" (${doc.mimeType})`,
      }
    } catch (err: unknown) {
      if (err instanceof DriveNotConnectedError) {
        return {
          success: false,
          error: 'DRIVE_NOT_CONNECTED',
          humanReadable: err.message,
        }
      }

      const message = err instanceof Error ? err.message : String(err)

      if (message.includes('404') || message.includes('notFound')) {
        return {
          success: false,
          error: 'FILE_NOT_FOUND',
          humanReadable: `File not found (ID: ${p.fileId}). It may have been deleted or you may not have access.`,
        }
      }

      if (message.includes('403') || message.includes('insufficientPermissions')) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          humanReadable: `You don't have permission to access this file (ID: ${p.fileId}).`,
        }
      }

      logger.error('readDriveDocument tool failed', { err, context })
      return {
        success: false,
        error: String(err),
        humanReadable: 'Failed to read the Drive document',
      }
    }
  },
}
