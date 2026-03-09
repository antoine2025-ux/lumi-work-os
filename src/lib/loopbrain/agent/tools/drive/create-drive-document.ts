/**
 * Loopbrain Tool: createDriveDocument
 *
 * Create a new Google Doc with the given title and content.
 * Write operation — requires user confirmation.
 */

import { z } from 'zod'
import type { LoopbrainTool, AgentContext, ToolResult } from '../../types'
import { getDriveClientForUser, DriveNotConnectedError } from '@/lib/integrations/drive/client'
import { createDriveDocument } from '@/lib/integrations/drive/write'
import { logger } from '@/lib/logger'

const CreateDriveDocumentSchema = z.object({
  title: z.string().min(1).max(500).describe('Document title'),
  content: z.string().min(1).describe('Document content (plain text)'),
  folderId: z.string().optional().describe('Optional parent folder ID'),
})

export const createDriveDocumentTool: LoopbrainTool = {
  name: 'createDriveDocument',
  description:
    'Create a new Google Doc with a title and content. Optionally place it in a specific folder. Returns the file ID and link.',
  category: 'drive',
  parameters: CreateDriveDocumentSchema,
  requiresConfirmation: true,
  permissions: { minimumRole: 'MEMBER' },

  async execute(params: unknown, context: AgentContext): Promise<ToolResult> {
    const p = CreateDriveDocumentSchema.parse(params)

    try {
      const client = await getDriveClientForUser(context.userId, context.workspaceId)

      const result = await createDriveDocument(client, p.title, p.content, p.folderId)

      return {
        success: true,
        data: {
          fileId: result.fileId,
          webViewLink: result.webViewLink,
          fileName: p.title,
        },
        humanReadable: `Created Google Doc "${p.title}" — ${result.webViewLink}`,
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

      if (message.includes('403') || message.includes('insufficientPermissions')) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          humanReadable:
            'Google Drive permissions are insufficient to create documents. Reconnect Drive in Settings.',
        }
      }

      logger.error('createDriveDocument tool failed', { err, context })
      return {
        success: false,
        error: String(err),
        humanReadable: 'Failed to create the Drive document',
      }
    }
  },
}
