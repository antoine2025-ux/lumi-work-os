/**
 * Google Drive integration types.
 */

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  modifiedTime: string
  size?: string
  parents?: string[]
  shared?: boolean
}

export interface DriveDocumentContent {
  content: string
  fileName: string
  mimeType: string
  lastModified: string
  truncated: boolean
  webViewLink: string
}

export interface DriveSearchOptions {
  mimeType?: string
  folderId?: string
  maxResults?: number
  orderBy?: string
  includeShared?: boolean
}

export const DRIVE_MIME_TYPES = {
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FOLDER: 'application/vnd.google-apps.folder',
  PDF: 'application/pdf',
  PLAIN_TEXT: 'text/plain',
  CSV: 'text/csv',
  MARKDOWN: 'text/markdown',
} as const

/** MIME types that represent Google Workspace native formats (exported via files.export) */
export const GOOGLE_NATIVE_MIME_TYPES: Set<string> = new Set([
  DRIVE_MIME_TYPES.DOCUMENT,
  DRIVE_MIME_TYPES.SPREADSHEET,
  DRIVE_MIME_TYPES.PRESENTATION,
])

/** MIME types that can be reasonably read as text */
export const TEXT_READABLE_MIME_TYPES: Set<string> = new Set([
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
  'application/javascript',
  'text/css',
])

/** 10 MB limit for reading file content */
export const MAX_READ_SIZE_BYTES = 10 * 1024 * 1024
