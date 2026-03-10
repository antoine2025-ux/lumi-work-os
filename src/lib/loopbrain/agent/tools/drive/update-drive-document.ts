/**
 * Loopbrain Tool: updateDriveDocument
 *
 * Update an existing Google Doc's content (append or replace).
 * Write operation — requires user confirmation.
 */

import { z } from 'zod'
import type { LoopbrainTool, AgentContext, ToolResult } from '../../types'
import { getDriveClientForUser, DriveNotConnectedError } from '@/lib/integrations/drive/client'
import { updateDriveDocument } from '@/lib/integrations/drive/write'
import { logger } from '@/lib/logger'

const UpdateDriveDocumentSchema = z.object({
  fileId: z.string().min(1).describe('Google Drive file ID'),
  content: z.string().min(1).describe('New content (plain text)'),
  mode: z
    .enum(['append', 'replace'])
    .describe('"append" adds to the end; "replace" overwrites the entire document'),
})

export const updateDriveDocumentTool: LoopbrainTool = {
  name: 'updateDriveDocument',
  description:
    'Update an existing Google Doc. Use mode "append" to add content to the end, or "replace" to overwrite the entire document. Use searchDriveFiles or readDriveDocument first to find the file ID.',
  category: 'drive',
  parameters: UpdateDriveDocumentSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },

  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = UpdateDriveDocumentSchema.parse(params)

    try {
      const client = await getDriveClientForUser(context.userId, context.workspaceId)

      const result = await updateDriveDocument(client, p.fileId, p.content, p.mode)

      return {
        success: true,
        data: {
          success: result.success,
          webViewLink: result.webViewLink,
        },
        humanReadable: `Updated document (${p.mode} mode) — ${result.webViewLink}`,
      }
    } catch (err) {
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
          humanReadable: `You don't have permission to edit this file (ID: ${p.fileId}).`,
        }
      }

      logger.error('updateDriveDocument tool failed', { err, context })
      return {
        success: false,
        error: String(err),
        humanReadable: 'Failed to update the Drive document',
      }
    }
  },
}
