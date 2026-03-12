/**
 * Hook for slash command menu functionality
 * Detects "/" trigger and manages menu state
 */

"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Editor } from '@tiptap/core'
import { getSlashCommandItems, SlashCommandItem } from './extensions/slash-command'

export interface SlashCommandState {
  isOpen: boolean
  query: string
  items: SlashCommandItem[]
  position: { top: number; left: number } | null
}

export function useSlashCommand(editor: Editor | null) {
  const [state, setState] = useState<SlashCommandState>({
    isOpen: false,
    query: '',
    items: [],
    position: null,
  })

  const menuRef = useRef<HTMLDivElement>(null)

  // Filter items based on query
  const filterItems = useCallback((query: string): SlashCommandItem[] => {
    const allItems = getSlashCommandItems()
    if (!query) {
      return allItems
    }
    return allItems.filter(item => {
      // Search in title and keywords (keywords is now required)
      const searchableText = `${item.title} ${item.keywords.join(' ')}`.toLowerCase()
      return searchableText.includes(query.toLowerCase())
    })
  }, [])

  // Get cursor position for menu placement
  const getCursorPosition = useCallback((): { top: number; left: number } | null => {
    if (!editor) return null

    try {
      const { selection } = editor.state
      const { $anchor } = selection
      const coords = editor.view.coordsAtPos($anchor.pos)

      return {
        top: coords.bottom + window.scrollY + 4, // Small offset below cursor
        left: coords.left + window.scrollX,
      }
    } catch (error: unknown) {
      console.warn('Failed to get cursor position:', error)
      return null
    }
  }, [editor])

  // Check if we should show slash menu
  const checkSlashCommand = useCallback(() => {
    if (!editor) return

    const { selection } = editor.state
    const { $anchor } = selection
    
    // Get the parent node (paragraph, heading, etc.)
    const parent = $anchor.parent
    const nodeType = parent.type.name

    // Only trigger in paragraph nodes
    if (nodeType !== 'paragraph') {
      setState(prev => ({ ...prev, isOpen: false }))
      return
    }

    // Get text from start of paragraph to cursor
    const paragraphStart = $anchor.start($anchor.depth)
    const textBefore = editor.state.doc.textBetween(paragraphStart, $anchor.pos, ' ', ' ')
    
    // Start-of-block guard: Only open menu if:
    // 1. Text matches ^\/\w*$ (slash at start, followed by optional word chars)
    // 2. OR preceding char is whitespace (for inline): \s\/\w*$
    // This prevents menu from opening when typing "/" in the middle of a word
    
    // Check for slash at start of paragraph: ^\/\w*$ (capture query)
    const startOfBlockMatch = textBefore.match(/^\/(\w*)$/)
    
    // Check for slash after whitespace: \s\/\w*$ (capture query)
    const afterWhitespaceMatch = textBefore.match(/\s\/(\w*)$/)
    
    const slashMatch = startOfBlockMatch || afterWhitespaceMatch
    
    if (slashMatch) {
      // Extract query from capture group (everything after "/")
      const query = (slashMatch[1] || '').toLowerCase()
      const items = filterItems(query)
      const position = getCursorPosition()

      if (items.length > 0 && position) {
        setState({
          isOpen: true,
          query,
          items,
          position,
        })
      } else {
        setState(prev => ({ ...prev, isOpen: false }))
      }
    } else {
      setState(prev => ({ ...prev, isOpen: false }))
    }
  }, [editor, filterItems, getCursorPosition])

  // Handle editor updates and selection changes
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      // Check immediately - editor state is already updated
      checkSlashCommand()
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, checkSlashCommand])

  // Execute command and close menu
  const executeCommand = useCallback((item: SlashCommandItem) => {
    if (!editor) return

    const { selection } = editor.state
    const { $anchor } = selection
    const paragraphStart = $anchor.start($anchor.depth)
    const textBefore = editor.state.doc.textBetween(paragraphStart, $anchor.pos, ' ', ' ')
    
    // Find the slash match to determine range to delete
    const startOfBlockMatch = textBefore.match(/^\/(\w*)$/)
    const afterWhitespaceMatch = textBefore.match(/\s\/(\w*)$/)
    const slashMatch = startOfBlockMatch || afterWhitespaceMatch
    
    let range: { from: number; to: number } | undefined = undefined
    
    if (slashMatch) {
      // Calculate range to delete (the "/query" text, including leading space if present)
      const matchText = slashMatch[0] // Full match including "/" and any leading space
      const deleteFrom = $anchor.pos - matchText.length
      range = { from: deleteFrom, to: $anchor.pos }
    }

    // Execute the command with range
    item.run({ editor, range })

    // Close menu
    setState(prev => ({ ...prev, isOpen: false }))
  }, [editor])

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    ...state,
    executeCommand,
    closeMenu,
    menuRef,
  }
}

