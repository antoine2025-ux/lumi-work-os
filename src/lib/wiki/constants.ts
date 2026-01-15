import { JSONContent } from '@tiptap/core'

/**
 * Empty TipTap document structure
 * Represents a valid empty document that can be used as a default
 */
export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph'
    }
  ]
}

