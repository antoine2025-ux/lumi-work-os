/**
 * Google Drive Search Helper
 *
 * Builds Drive query strings and searches files using the Drive API v3.
 */

import { drive_v3 } from 'googleapis'
import type { DriveFile, DriveSearchOptions } from './types'
import { logger } from '@/lib/logger'
import { withDriveRetry } from './retry'

const DRIVE_FILE_FIELDS =
  'files(id,name,mimeType,webViewLink,modifiedTime,size,parents,shared)'

/**
 * Build a Drive API query string from a user search query and options.
 * Always excludes trashed files.
 */
function buildDriveQuery(query: string, options?: DriveSearchOptions): string {
  const clauses: string[] = ['trashed = false']

  if (query) {
    const escaped = query.replace(/'/g, "\\'")
    clauses.push(`(name contains '${escaped}' or fullText contains '${escaped}')`)
  }

  if (options?.mimeType) {
    clauses.push(`mimeType = '${options.mimeType}'`)
  }

  if (options?.folderId) {
    clauses.push(`'${options.folderId}' in parents`)
  }

  return clauses.join(' and ')
}

/**
 * Search Google Drive files by name/content/metadata.
 *
 * @param client - Authenticated Drive API client
 * @param query - Search text (supports Drive search syntax)
 * @param options - Optional filters: mimeType, folderId, maxResults, orderBy
 * @returns Array of matching files
 */
export async function searchDriveFiles(
  client: drive_v3.Drive,
  query: string,
  options?: DriveSearchOptions,
): Promise<DriveFile[]> {
  const maxResults = Math.min(options?.maxResults ?? 10, 50)
  const orderBy = options?.orderBy ?? 'modifiedTime desc'
  const driveQuery = buildDriveQuery(query, options)

  logger.debug('Drive search', { query: driveQuery, maxResults, orderBy })

  const response = await withDriveRetry(
    () =>
      client.files.list({
        q: driveQuery,
        pageSize: maxResults,
        orderBy,
        fields: DRIVE_FILE_FIELDS,
        includeItemsFromAllDrives: options?.includeShared ?? false,
        supportsAllDrives: options?.includeShared ?? false,
      }),
    'searchFiles',
  )

  const files = response.data.files ?? []

  return files.map((f) => ({
    id: f.id ?? '',
    name: f.name ?? 'Untitled',
    mimeType: f.mimeType ?? 'unknown',
    webViewLink: f.webViewLink ?? '',
    modifiedTime: f.modifiedTime ?? '',
    size: f.size ?? undefined,
    parents: f.parents ?? undefined,
    shared: f.shared ?? undefined,
  }))
}
