/**
 * Block Targeting Utilities
 * 
 * Provides reliable detection of which block the cursor is currently in
 * and utilities for getting block ranges for operations like duplicate/delete
 */

import { Editor } from '@tiptap/core'

/**
 * Block types that we support gutter/actions for
 */
export const SUPPORTED_BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
  'table',
] as const

export type SupportedBlockType = typeof SUPPORTED_BLOCK_TYPES[number]

/**
 * Information about the currently active block
 */
export interface ActiveBlockInfo {
  /** The block node type name */
  type: string
  /** Start position of the block */
  from: number
  /** End position of the block */
  to: number
  /** The block node itself */
  node: any
  /** Whether this is a supported block type */
  isSupported: boolean
}

/**
 * Get information about the block at a given position in the document
 * Used for mouse position-based block detection
 * 
 * SAFE: Never accesses depth 0 (doc root) to avoid RangeError
 */
export function getBlockAtPos(editor: Editor, pos: number): ActiveBlockInfo | null {
  if (!editor) {
    console.log('[BLOCK TARGETING] getBlockAtPos: No editor')
    return null
  }

  try {
    const { state } = editor
    
    // Clamp position to valid range (avoid boundary errors)
    const safePos = Math.max(1, Math.min(pos, state.doc.content.size - 1))
    const $pos = state.doc.resolve(safePos)
    
    // Walk up the node tree to find block-level node
    // IMPORTANT: Start from depth and go down to 1 (never 0, which is doc root)
    // Depth 0 = doc (cannot use before(0))
    // Depth 1+ = actual content nodes
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth)
      const nodeType = node.type.name

      // Check if this is a supported block type
      if (SUPPORTED_BLOCK_TYPES.includes(nodeType as SupportedBlockType)) {
        // Safe: depth > 0, so before(depth) is valid
        const blockPos = $pos.before(depth)
        return {
          type: nodeType,
          from: blockPos,
          to: blockPos + node.nodeSize,
          node: node,
          isSupported: true,
        }
      }
    }

    return null
  } catch (error) {
    console.warn('[BLOCK TARGETING] Error getting block at position:', error)
    return null
  }
}

/**
 * Get information about the block the cursor is currently in
 * 
 * This handles all block types including:
 * - Paragraph, headings (direct blocks)
 * - Lists (bulletList, orderedList, taskList - the list container)
 * - List items (listItem, taskItem - treated as part of parent list)
 * - Code blocks
 * - Blockquotes
 * - Tables (entire table treated as one block)
 */
/**
 * Get information about the block the cursor is currently in
 * 
 * SAFE: Never accesses depth 0 (doc root) to avoid RangeError
 * Uses $anchor.node(-1) which is safe (gets node at depth - 1, i.e., depth 1)
 * But we must ensure depth > 0 before calling before(depth)
 */
export function getActiveBlock(editor: Editor): ActiveBlockInfo | null {
  if (!editor) {
    return null
  }

  try {
    const { selection } = editor.state
    const { $anchor } = selection
    
    // Safety check: ensure we have valid depth
    if ($anchor.depth === 0) {
      // At document root - no block to return
      return null
    }

    // Helper to safely get block info from a node at a specific depth
    const getBlockAtDepth = (depth: number): ActiveBlockInfo | null => {
      if (depth <= 0) return null // Never access depth 0
      
      try {
        const node = $anchor.node(depth)
        const nodeType = node.type.name
        
        if (SUPPORTED_BLOCK_TYPES.includes(nodeType as SupportedBlockType)) {
          const blockPos = $anchor.before(depth)
          return {
            type: nodeType,
            from: blockPos,
            to: blockPos + node.nodeSize,
            node: node,
            isSupported: true,
          }
        }
      } catch (error) {
        // Ignore errors at this depth, try next
        return null
      }
      
      return null
    }

    // For tables, check if we're inside a table first
    if (editor.isActive('table')) {
      // Walk up to find table node (depth > 0)
      for (let depth = $anchor.depth; depth > 0; depth--) {
        const node = $anchor.node(depth)
        if (node && node.type.name === 'table') {
          const blockPos = $anchor.before(depth)
          return {
            type: 'table',
            from: blockPos,
            to: blockPos + node.nodeSize,
            node: node,
            isSupported: true,
          }
        }
      }
    }

    // For code blocks
    if (editor.isActive('codeBlock')) {
      for (let depth = $anchor.depth; depth > 0; depth--) {
        const node = $anchor.node(depth)
        if (node && node.type.name === 'codeBlock') {
          const blockPos = $anchor.before(depth)
          return {
            type: 'codeBlock',
            from: blockPos,
            to: blockPos + node.nodeSize,
            node: node,
            isSupported: true,
          }
        }
      }
    }

    // For blockquotes
    if (editor.isActive('blockquote')) {
      for (let depth = $anchor.depth; depth > 0; depth--) {
        const node = $anchor.node(depth)
        if (node && node.type.name === 'blockquote') {
          const blockPos = $anchor.before(depth)
          return {
            type: 'blockquote',
            from: blockPos,
            to: blockPos + node.nodeSize,
            node: node,
            isSupported: true,
          }
        }
      }
    }

    // For lists (bulletList, orderedList, taskList)
    // We want to treat the entire list as one block
    const listTypes = ['bulletList', 'orderedList', 'taskList']
    for (const listType of listTypes) {
      if (editor.isActive(listType)) {
        // Walk up the node tree to find the list container (depth > 0)
        for (let depth = $anchor.depth; depth > 0; depth--) {
          const node = $anchor.node(depth)
          if (node && listTypes.includes(node.type.name)) {
            const blockPos = $anchor.before(depth)
            return {
              type: node.type.name,
              from: blockPos,
              to: blockPos + node.nodeSize,
              node: node,
              isSupported: true,
            }
          }
        }
      }
    }

    // For headings
    if (editor.isActive('heading')) {
      for (let depth = $anchor.depth; depth > 0; depth--) {
        const node = $anchor.node(depth)
        if (node && node.type.name === 'heading') {
          const blockPos = $anchor.before(depth)
          return {
            type: 'heading',
            from: blockPos,
            to: blockPos + node.nodeSize,
            node: node,
            isSupported: true,
          }
        }
      }
    }

    // For paragraphs (default case) - walk up to find paragraph
    for (let depth = $anchor.depth; depth > 0; depth--) {
      const node = $anchor.node(depth)
      if (node && node.type.name === 'paragraph') {
        const blockPos = $anchor.before(depth)
        return {
          type: 'paragraph',
          from: blockPos,
          to: blockPos + node.nodeSize,
          node: node,
          isSupported: true,
        }
      }
    }

    // Fallback: try to find any supported block type
    for (let depth = $anchor.depth; depth > 0; depth--) {
      const node = $anchor.node(depth)
      const nodeType = node.type.name
      if (SUPPORTED_BLOCK_TYPES.includes(nodeType as SupportedBlockType)) {
        const blockPos = $anchor.before(depth)
        return {
          type: nodeType,
          from: blockPos,
          to: blockPos + node.nodeSize,
          node: node,
          isSupported: true,
        }
      }
    }

    return null
  } catch (error) {
    console.warn('[BLOCK TARGETING] Error getting active block:', error)
    return null
  }
}

/**
 * Get the DOM element for a block at a given position
 * Used for positioning the gutter overlay
 */
export function getBlockDOMElement(editor: Editor, from: number): HTMLElement | null {
  if (!editor) return null

  try {
    const dom = editor.view.domAtPos(from)
    if (!dom.node) return null

    // Find the block-level element (pre, p, h1-h6, blockquote, ul, ol, table)
    let element: Node | null = dom.node

    // If it's a text node, go up to find the block element
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement
    }

    // Walk up to find block-level element
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      const tagName = (element as HTMLElement).tagName?.toLowerCase()
      if (
        tagName === 'p' ||
        tagName === 'h1' ||
        tagName === 'h2' ||
        tagName === 'h3' ||
        tagName === 'h4' ||
        tagName === 'h5' ||
        tagName === 'h6' ||
        tagName === 'blockquote' ||
        tagName === 'pre' ||
        tagName === 'ul' ||
        tagName === 'ol' ||
        tagName === 'table'
      ) {
        return element as HTMLElement
      }
      element = element.parentElement
    }

    return null
  } catch (error) {
    console.warn('Error getting block DOM element:', error)
    return null
  }
}
