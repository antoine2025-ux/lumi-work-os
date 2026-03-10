/**
 * Google Drive Read Helper
 *
 * Reads document content from Google Drive files.
 * Handles Google Docs, Sheets, PDFs, and plain text files.
 */

import { drive_v3 } from 'googleapis'
import type { DriveDocumentContent } from './types'
import {
  DRIVE_MIME_TYPES,
  GOOGLE_NATIVE_MIME_TYPES,
  TEXT_READABLE_MIME_TYPES,
  MAX_READ_SIZE_BYTES,
} from './types'
import { logger } from '@/lib/logger'
import { Readable } from 'stream'
import { withDriveRetry } from './retry'

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

/**
 * Get the export MIME type for a Google Workspace native format.
 */
function getExportMimeType(
  nativeMimeType: string,
  format: 'text' | 'markdown',
): string {
  if (nativeMimeType === DRIVE_MIME_TYPES.SPREADSHEET) {
    return 'text/csv'
  }
  if (nativeMimeType === DRIVE_MIME_TYPES.PRESENTATION) {
    return 'text/plain'
  }
  // Google Docs
  return format === 'markdown' ? 'text/markdown' : 'text/plain'
}

/**
 * Read the text content of a Google Drive file.
 *
 * Strategy by mimeType:
 * - Google Docs/Sheets/Slides: files.export as text/plain, text/csv, or text/markdown
 * - PDFs: metadata-only (Drive cannot export PDF content as text)
 * - Text-based files: files.get with alt=media
 * - Binary files: metadata-only with descriptive message
 *
 * @param client - Authenticated Drive API client
 * @param fileId - Google Drive file ID
 * @param format - Output format preference ('text' or 'markdown')
 */
export async function readDriveDocument(
  client: drive_v3.Drive,
  fileId: string,
  format: 'text' | 'markdown' = 'text',
): Promise<DriveDocumentContent> {
  const fileMeta = await withDriveRetry(
    () =>
      client.files.get({
        fileId,
        fields: 'id,name,mimeType,modifiedTime,webViewLink,size',
      }),
    'readDocument.getMeta',
  )

  const meta = fileMeta.data
  const mimeType = meta.mimeType ?? 'unknown'
  const fileName = meta.name ?? 'Untitled'
  const lastModified = meta.modifiedTime ?? ''
  const webViewLink = meta.webViewLink ?? ''

  const baseResult: Omit<DriveDocumentContent, 'content' | 'truncated'> = {
    fileName,
    mimeType,
    lastModified,
    webViewLink,
  }

  // Google Workspace native formats: use files.export
  if (GOOGLE_NATIVE_MIME_TYPES.has(mimeType)) {
    const exportMime = getExportMimeType(mimeType, format)

    logger.debug('Drive read: exporting native format', { fileId, mimeType, exportMime })

    const exported = await withDriveRetry(
      () =>
        client.files.export(
          { fileId, mimeType: exportMime },
          { responseType: 'stream' },
        ),
      'readDocument.export',
    )

    const content = await streamToString(exported.data as unknown as Readable)
    const truncated = Buffer.byteLength(content, 'utf-8') > MAX_READ_SIZE_BYTES

    return {
      ...baseResult,
      content: truncated ? content.slice(0, MAX_READ_SIZE_BYTES) : content,
      truncated,
    }
  }

  // PDFs cannot be reliably exported as text via Drive API
  if (mimeType === DRIVE_MIME_TYPES.PDF) {
    return {
      ...baseResult,
      content: '[PDF file — content cannot be extracted as text via Drive API. Open in browser to view.]',
      truncated: false,
    }
  }

  // Text-readable files: download content directly
  if (TEXT_READABLE_MIME_TYPES.has(mimeType)) {
    const fileSize = meta.size ? parseInt(meta.size, 10) : 0
    if (fileSize > MAX_READ_SIZE_BYTES) {
      return {
        ...baseResult,
        content: `[File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_READ_SIZE_BYTES / 1024 / 1024}MB limit]`,
        truncated: true,
      }
    }

    logger.debug('Drive read: downloading text file', { fileId, mimeType })

    const downloaded = await withDriveRetry(
      () =>
        client.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' },
        ),
      'readDocument.download',
    )

    const content = await streamToString(downloaded.data as unknown as Readable)
    const truncated = Buffer.byteLength(content, 'utf-8') > MAX_READ_SIZE_BYTES

    return {
      ...baseResult,
      content: truncated ? content.slice(0, MAX_READ_SIZE_BYTES) : content,
      truncated,
    }
  }

  // Binary/unsupported files: return metadata only
  return {
    ...baseResult,
    content: `[Binary file (${mimeType}) — content not readable as text. Open in browser to view.]`,
    truncated: false,
  }
}
