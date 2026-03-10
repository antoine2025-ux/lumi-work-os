/**
 * Google Drive Write Helper
 *
 * Create and update Google Docs via the Drive API v3.
 */

import { drive_v3 } from 'googleapis'
import { Readable } from 'stream'
import { DRIVE_MIME_TYPES, GOOGLE_NATIVE_MIME_TYPES } from './types'
import { logger } from '@/lib/logger'
import { withDriveRetry } from './retry'

/**
 * Create a new Google Doc with the given content.
 *
 * @param client - Authenticated Drive API client
 * @param name - Document title
 * @param content - Plain text content
 * @param folderId - Optional parent folder ID
 */
export async function createDriveDocument(
  client: drive_v3.Drive,
  name: string,
  content: string,
  folderId?: string,
): Promise<{ fileId: string; webViewLink: string }> {
  const fileMetadata: drive_v3.Schema$File = {
    name,
    mimeType: DRIVE_MIME_TYPES.DOCUMENT,
    ...(folderId ? { parents: [folderId] } : {}),
  }

  const media = {
    mimeType: 'text/plain',
    body: Readable.from(content),
  }

  logger.debug('Drive write: creating document', { name, folderId })

  const response = await withDriveRetry(
    () =>
      client.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,webViewLink',
      }),
    'createDocument',
  )

  const fileId = response.data.id
  const webViewLink = response.data.webViewLink

  if (!fileId) {
    throw new Error('Failed to create Drive document: no file ID returned')
  }

  return {
    fileId,
    webViewLink: webViewLink ?? `https://docs.google.com/document/d/${fileId}/edit`,
  }
}

/**
 * Update an existing Google Doc's content.
 *
 * @param client - Authenticated Drive API client
 * @param fileId - Drive file ID
 * @param content - New content (plain text)
 * @param mode - 'replace' overwrites content; 'append' adds to the end
 */
export async function updateDriveDocument(
  client: drive_v3.Drive,
  fileId: string,
  content: string,
  mode: 'append' | 'replace',
): Promise<{ success: boolean; webViewLink: string }> {
  let finalContent = content

  if (mode === 'append') {
    const fileMeta = await withDriveRetry(
      () =>
        client.files.get({
          fileId,
          fields: 'mimeType',
        }),
      'updateDocument.getMeta',
    )
    const mimeType = fileMeta.data.mimeType ?? ''

    let existingContent = ''
    if (GOOGLE_NATIVE_MIME_TYPES.has(mimeType)) {
      const exported = await withDriveRetry(
        () =>
          client.files.export(
            { fileId, mimeType: 'text/plain' },
            { responseType: 'text' },
          ),
        'updateDocument.export',
      )
      existingContent = String(exported.data ?? '')
    }

    finalContent = existingContent + '\n\n' + content
  }

  const media = {
    mimeType: 'text/plain',
    body: Readable.from(finalContent),
  }

  logger.debug('Drive write: updating document', { fileId, mode })

  const response = await withDriveRetry(
    () =>
      client.files.update({
        fileId,
        media,
        fields: 'id,webViewLink',
      }),
    'updateDocument',
  )

  const webViewLink = response.data.webViewLink

  return {
    success: true,
    webViewLink: webViewLink ?? `https://docs.google.com/document/d/${fileId}/edit`,
  }
}
