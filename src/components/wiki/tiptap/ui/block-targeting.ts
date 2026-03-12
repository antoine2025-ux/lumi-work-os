/**
 * Block Targeting Utilities
 * 
 * Provides reliable detection of which block the cursor is currently in
 * and utilities for getting block ranges for operations like duplicate/delete
 */

import { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

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
  node: ProseMirrorNode
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
  } catch (error: unknown) {
    console.warn('[BLOCK TARGETING] Error getting block at position:', error)
    return null
  }
}

/**
 * Get information about the block the cursor is currently in
 *
 * Handles all supported block types by walking up the node tree once.
 * SAFE: Never accesses depth 0 (doc root) to avoid RangeError.
 */
export function getActiveBlock(editor: Editor): ActiveBlockInfo | null {
  if (!editor) {
    return null
  }

  try {
    const { selection } = editor.state
    const { $anchor } = selection

    if ($anchor.depth === 0) {
      return null
    }

    // Single upward walk — check node type directly instead of calling isActive() per type
    for (let depth = $anchor.depth; depth > 0; depth--) {
      const node = $anchor.node(depth)
      const nodeType = node.type.name

      if (SUPPORTED_BLOCK_TYPES.includes(nodeType as SupportedBlockType)) {
        const blockPos = $anchor.before(depth)
        return {
          type: nodeType,
          from: blockPos,
          to: blockPos + node.nodeSize,
          node,
          isSupported: true,
        }
      }
    }

    return null
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.warn('Error getting block DOM element:', error)
    return null
  }
}
