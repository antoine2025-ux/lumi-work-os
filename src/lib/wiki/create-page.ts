/**
 * Centralized wiki page creation helper
 * 
 * Ensures all new pages are created with JSON format and proper contentJson.
 * This helper should be used by all UI entry points to guarantee consistency.
 */

import { JSONContent } from '@tiptap/core'
import { EMPTY_TIPTAP_DOC } from './constants'
import { isValidProseMirrorJSON } from './text-extract'

export interface CreateWikiPageParams {
  workspaceId?: string // Optional - will be inferred from auth if not provided
  projectId?: string // Optional - for project-linked pages
  parentId?: string | null // Optional - for subpages
  title: string
  contentJson?: JSONContent | null // Optional - defaults to EMPTY_TIPTAP_DOC
  tags?: string[]
  category?: string
  permissionLevel?: 'personal' | 'team'
  workspace_type?: string
}

export interface CreateWikiPageResult {
  id: string
  slug: string
  title: string
  contentFormat: 'JSON'
  contentJson: JSONContent
  workspace_type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * Creates a new wiki page via the API
 * 
 * Always creates pages with contentFormat='JSON' and ensures contentJson is valid.
 * Falls back to EMPTY_TIPTAP_DOC if contentJson is missing or invalid.
 * 
 * @param params - Page creation parameters
 * @returns The created page data
 * @throws Error if creation fails
 */
export async function createWikiPage(
  params: CreateWikiPageParams
): Promise<CreateWikiPageResult> {
  const {
    workspaceId,
    parentId,
    title,
    contentJson,
    tags = [],
    category = 'general',
    permissionLevel,
    workspace_type
  } = params

  // Validate title
  if (!title || !title.trim()) {
    throw new Error('Title is required')
  }

  // Validate and normalize contentJson
  let finalContentJson: JSONContent
  if (contentJson && isValidProseMirrorJSON(contentJson)) {
    finalContentJson = contentJson
  } else {
    // Use empty doc as fallback
    finalContentJson = EMPTY_TIPTAP_DOC
  }

  interface CreatePageBody {
    title: string
    contentJson: JSONContent
    contentFormat: 'JSON'
    tags: string[]
    category: string
    workspaceId?: string
    parentId?: string | null
    permissionLevel?: string
    workspace_type?: string
  }

  const body: CreatePageBody = {
    title: title.trim(),
    contentJson: finalContentJson,
    contentFormat: 'JSON', // Always JSON for new pages
    tags,
    category
  }

  if (workspaceId) {
    body.workspaceId = workspaceId
  }
  if (parentId) {
    body.parentId = parentId
  }
  if (permissionLevel) {
    body.permissionLevel = permissionLevel
  }
  if (workspace_type) {
    body.workspace_type = workspace_type
  }

  // Make API request
  const response = await fetch('/api/wiki/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    let errorMessage = 'Failed to create page'
    try {
      const errorData = await response.json()
      const err = errorData.error
      // API may return { error: string } or { error: { code, message } }
      errorMessage = typeof err === 'string' ? err : (err?.message ?? errorData.message ?? errorMessage)
    } catch (_parseError) {
      // Ignore parse errors, use default message
    }
    throw new Error(errorMessage)
  }

  const page = await response.json()

  // Ensure the result has the expected format
  if (page.contentFormat !== 'JSON') {
    console.warn('⚠️ Created page does not have contentFormat=JSON:', page)
  }

  return page as CreateWikiPageResult
}
