/**
 * Text extraction utility for TipTap/ProseMirror JSON documents
 * Converts structured JSON content to plain text for search indexing and LoopBrain context
 */

import { JSONContent } from '@tiptap/core'

/**
 * Extract plain text from a TipTap JSON document
 * Handles nested content arrays and common node types
 * 
 * @param json - TipTap JSONContent document
 * @returns Plain text string with normalized whitespace
 */
export function extractTextFromProseMirror(json: JSONContent | null | undefined): string {
  if (!json) return ''

  const extract = (node: JSONContent): string => {
    // Handle text nodes
    if (node.type === 'text') {
      return node.text || ''
    }

    // Handle task items: include checkbox state in text
    // Format: "[ ] Task text" or "[x] Task text" on separate lines
    if (node.type === 'taskItem') {
      const text = node.content && Array.isArray(node.content)
        ? node.content.map(extract).join('').trim()
        : ''
      const checked = node.attrs?.checked ? '[x]' : '[ ]'
      // Deterministic: checkbox marker, single space, task text, newline
      return `${checked} ${text}\n`
    }

    // Handle table cells: extract text content
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      const text = node.content && Array.isArray(node.content)
        ? node.content.map(extract).join('').trim()
        : ''
      return text
    }

    // Handle table rows: join cells with tabs
    if (node.type === 'tableRow') {
      const cells = node.content && Array.isArray(node.content)
        ? node.content.map(extract).filter(cell => cell.trim()).join('\t')
        : ''
      return cells
    }

    // Handle tables: join rows with newlines
    if (node.type === 'table') {
      const rows = node.content && Array.isArray(node.content)
        ? node.content.map(extract).filter(row => row.trim()).join('\n')
        : ''
      return rows + '\n'
    }

    // Handle code blocks explicitly - ensure text content is extracted
    // Code blocks (including codeBlockLowlight) store text in content array as text nodes
    if (node.type === 'codeBlock') {
      const text = node.content && Array.isArray(node.content)
        ? node.content.map(extract).join('')
        : ''
      // Return code block content with newline (preserves multiline ASCII diagrams)
      return text + '\n'
    }

    // Handle nodes with content array
    if (node.content && Array.isArray(node.content)) {
      const text = node.content.map(extract).join('')
      
      // Add line breaks for block-level elements
      const blockTypes = ['paragraph', 'heading', 'blockquote', 'listItem', 'taskList']
      if (node.type && blockTypes.includes(node.type)) {
        return text + '\n'
      }
      
      // Add spaces for inline elements
      return text
    }

    return ''
  }

  const text = extract(json)
  
  // Normalize whitespace: collapse multiple spaces/newlines, trim
  // Note: Preserves task item newlines (each task on its own line)
  return text
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines (but preserve task item separators)
    .replace(/[ \t]+/g, ' ')     // Collapse spaces/tabs (but not newlines)
    .trim()
}

/**
 * Validate that a JSON object is a valid TipTap document structure
 * 
 * @param json - Object to validate
 * @returns true if valid TipTap document
 */
export function isValidProseMirrorJSON(json: unknown): json is JSONContent {
  if (!json || typeof json !== 'object') return false
  if (!('type' in json) || json.type !== 'doc') return false
  if (!('content' in json) || !Array.isArray(json.content)) return false
  return true
}

