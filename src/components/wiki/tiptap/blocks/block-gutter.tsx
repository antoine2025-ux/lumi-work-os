/**
 * Block Gutter Component
 * 
 * Notion-style left gutter that appears on hover/active blocks
 * Shows "+" button to insert block below and "⋮⋮" button for block actions
 * 
 * FIXED: State-driven visibility to prevent flicker when moving mouse to gutter
 */

"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, GripVertical } from 'lucide-react'
import { getActiveBlock, getBlockAtPos, getBlockDOMElement } from '../ui/block-targeting'
import { turnIntoBlock, duplicateBlock, deleteBlock } from '../commands/block-commands'

/**
 * PHASE 0: Mounting and Wiring Documentation
 * 
 * Where it's mounted:
 * - src/components/wiki/tiptap-editor.tsx:158
 * - Condition: {editor && editable && <BlockGutter editor={editor} onInsertBlock={handleInsertBlock} />}
 * - Only rendered in edit mode (not read view)
 * 
 * How it gets editor:
 * - Receives editor prop directly from TipTapEditor component
 * - Editor is created via useEditor() hook in TipTapEditor
 * - Editor instance is guaranteed to exist when BlockGutter renders (guarded by editor check)
 */

const CANARY_MODE = false // Set to true to verify component mounting

interface BlockGutterProps {
  editor: Editor | null
  onInsertBlock: (position: { top: number; left: number }) => void
}

export function BlockGutter({ editor, onInsertBlock: _onInsertBlock }: BlockGutterProps) {
  // State-driven: Track active block by position (not hover)
  const [activeBlockPos, setActiveBlockPos] = useState<number | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const isGutterHoveredRef = useRef(false)
  const gutterRef = useRef<HTMLDivElement>(null)
  const positioningRootRef = useRef<HTMLElement | null>(null)
  const scrollContainerRef = useRef<HTMLElement | Window | null>(null)

  // Helper: Find the scroll container (element with overflow or window)
  const findScrollContainer = useCallback((element: HTMLElement): HTMLElement | Window => {
    let current: HTMLElement | null = element
    while (current) {
      const style = window.getComputedStyle(current)
      const overflowY = style.overflowY || style.overflow
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight
      ) {
        return current
      }
      current = current.parentElement
    }
    return window
  }, [])

  // Initialize positioning root and scroll container
  useEffect(() => {
    if (!editor) return

    const editorDom = editor.view.dom
    const editorWrapper = editorDom.parentElement
    if (!editorWrapper) return

    positioningRootRef.current = editorWrapper
    scrollContainerRef.current = findScrollContainer(editorWrapper)
  }, [editor, findScrollContainer])


  // PHASE 3 & 4: Update position based on selection coordinates
  // First uses coordsAtPos (Phase 3), then switches to block container (Phase 4)
  const updatePosition = useCallback((blockPos: number) => {
    if (!editor) return

    // Validate blockPos: must be > 0 and within document bounds
    if (blockPos < 0 || blockPos >= editor.state.doc.content.size) {
      if (CANARY_MODE) {
      }
      return
    }

    try {
      // PHASE 4: Get the actual block DOM element (preferred method)
      const blockElement = getBlockDOMElement(editor, blockPos)
      if (blockElement) {
        // Get block's bounding rect (viewport coordinates)
        const blockRect = blockElement.getBoundingClientRect()
        
        // Vertically center the gutter relative to block height
        // Gutter height is approximately 48px (two buttons + gap)
        const GUTTER_HEIGHT = 48
        const GUTTER_OFFSET = 48
        const top = blockRect.top + (blockRect.height / 2) - (GUTTER_HEIGHT / 2)
        const left = blockRect.left - GUTTER_OFFSET

        // Skip rendering if block is off-screen (avoid placing gutter at viewport corner)
        if (isNaN(top) || isNaN(left) || top < -50 || left < -50) {
          return
        }

        if (CANARY_MODE) {
        }

        setPosition({ top, left })
        return
      } else if (CANARY_MODE) {
      }
    } catch (error: unknown) {
      if (CANARY_MODE) {
        console.warn('[GUTTER] updatePosition: error getting block element', error)
      }
      // Fall through to Phase 3 fallback
    }

    // PHASE 3: Fallback to coordsAtPos if DOM lookup fails
    try {
      const coords = editor.view.coordsAtPos(blockPos)
      if (coords) {
        const GUTTER_OFFSET = 48
        const top = coords.top
        const left = coords.left - GUTTER_OFFSET

        // Skip rendering if block is off-screen
        if (isNaN(top) || isNaN(left) || top < -50 || left < -50) {
          return
        }

        if (CANARY_MODE) {
        }

        setPosition({ top, left })
      }
    } catch (error: unknown) {
      if (CANARY_MODE) {
        console.warn('[GUTTER] updatePosition: coordsAtPos failed', error)
      }
    }
  }, [editor])

  // PHASE 3 & 5: Determine which block should be active based on selection OR mouse position
  const determineActiveBlock = useCallback((mouseX?: number, mouseY?: number): number | null => {
    if (!editor || !editor.isEditable) {
      return null
    }

    // Priority 1: Check if selection is in a block (PHASE 3: selection-based)
    const selectionBlock = getActiveBlock(editor)
    if (selectionBlock && selectionBlock.isSupported && selectionBlock.from > 0) {
      return selectionBlock.from
    }

    // Priority 2: If mouse position provided, check block at mouse coordinates (PHASE 5: hover)
    if (mouseX !== undefined && mouseY !== undefined) {
      try {
        const coords = { left: mouseX, top: mouseY }
        const pos = editor.view.posAtCoords(coords)
        if (pos && pos.pos !== null) {
          // Clamp position to valid range before resolving
          const { state } = editor
          const safePos = Math.max(1, Math.min(pos.pos, state.doc.content.size - 1))
          const mouseBlock = getBlockAtPos(editor, safePos)
          if (mouseBlock && mouseBlock.isSupported && mouseBlock.from > 0) {
            return mouseBlock.from
          }
        }
      } catch (_error) {
        // Silently ignore errors from posAtCoords (e.g., outside editor bounds)
      }
    }

    return null
  }, [editor])

  // PHASE 3: Update active block from selection changes (selection-based activation)
  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      const blockPos = determineActiveBlock()
      if (blockPos !== null) {
        // Temporary debug: log when block is activated
        if (CANARY_MODE) {
        }
        setActiveBlockPos(blockPos)
        updatePosition(blockPos)
      } else if (!isGutterHoveredRef.current) {
        // PHASE 5: Only clear if gutter is not hovered (hover lock)
        if (CANARY_MODE) {
        }
        setActiveBlockPos(null)
        setPosition(null)
      }
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('update', handleSelectionUpdate)

    // Initial check
    handleSelectionUpdate()

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('update', handleSelectionUpdate)
    }
  }, [editor, determineActiveBlock, updatePosition])

  // Listen to scroll events to update position (throttled with requestAnimationFrame)
  useEffect(() => {
    if (!editor || activeBlockPos === null) return

    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        if (activeBlockPos !== null) {
          updatePosition(activeBlockPos)
        }
        rafId = null
      })
    }

    // Always listen to window scroll
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Also listen to scroll container if it's not window
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer && scrollContainer !== window && scrollContainer instanceof HTMLElement) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollContainer && scrollContainer !== window && scrollContainer instanceof HTMLElement) {
        scrollContainer.removeEventListener('scroll', handleScroll)
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [editor, activeBlockPos, updatePosition])

  // Track mouse position inside editor to detect block hover
  useEffect(() => {
    if (!editor || !editor.isEditable) return

    const editorElement = editor.view.dom
    let hideTimeout: NodeJS.Timeout | null = null

    const handleMouseMove = (e: MouseEvent) => {
      // Clear any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }

      // Check if mouse is over the gutter itself - lock visibility
      if (gutterRef.current && gutterRef.current.contains(e.target as Node)) {
        // Mouse is over gutter - keep it visible
        return
      }

      // Check if mouse is inside editor
      const editorRect = editorElement.getBoundingClientRect()
      const mouseX = e.clientX
      const mouseY = e.clientY

      const isInsideEditor = 
        mouseX >= editorRect.left &&
        mouseX <= editorRect.right &&
        mouseY >= editorRect.top &&
        mouseY <= editorRect.bottom

      if (isInsideEditor) {
        // Mouse is inside editor - determine active block from mouse position
        const blockPos = determineActiveBlock(mouseX, mouseY)
        if (blockPos !== null) {
          setActiveBlockPos(blockPos)
          updatePosition(blockPos)
        }
      } else {
        // Mouse left editor - hide gutter after delay (unless selection is in block or gutter is hovered)
        hideTimeout = setTimeout(() => {
          if (isGutterHoveredRef.current) return // Don't hide if gutter is hovered
          
          const selectionBlock = getActiveBlock(editor)
          if (!selectionBlock || !selectionBlock.isSupported) {
            // Only hide if selection is not in a supported block
            setActiveBlockPos(null)
            setPosition(null)
          }
        }, 150) // Small delay to prevent flicker when moving mouse quickly
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Check if mouse is leaving editor (not just moving to child element)
      const relatedTarget = e.relatedTarget as Node | null
      if (!editorElement.contains(relatedTarget) && !gutterRef.current?.contains(relatedTarget)) {
        // Mouse truly left editor - check if we should hide
        if (isGutterHoveredRef.current) return // Don't hide if gutter is hovered
        
        const selectionBlock = getActiveBlock(editor)
        if (!selectionBlock || !selectionBlock.isSupported) {
          setActiveBlockPos(null)
          setPosition(null)
        }
      }
    }

    editorElement.addEventListener('mousemove', handleMouseMove)
    editorElement.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      editorElement.removeEventListener('mousemove', handleMouseMove)
      editorElement.removeEventListener('mouseleave', handleMouseLeave)
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }
  }, [editor, determineActiveBlock, updatePosition])

  // Handle gutter hover to "lock" visibility
  const handleGutterMouseEnter = useCallback(() => {
    isGutterHoveredRef.current = true
  }, [])

  const handleGutterMouseLeave = useCallback(() => {
    isGutterHoveredRef.current = false
    // When leaving gutter, check if we should keep it visible
    if (!editor) return
    
    const selectionBlock = getActiveBlock(editor)
    if (selectionBlock && selectionBlock.isSupported) {
      // Selection is in a block - keep gutter visible
      setActiveBlockPos(selectionBlock.from)
      updatePosition(selectionBlock.from)
    } else {
      // No selection in block - hide gutter
      setActiveBlockPos(null)
      setPosition(null)
    }
  }, [editor, updatePosition])

  const handleInsertBlock = () => {
    if (!editor) return
    
    // Get current block and move cursor to end, then insert "/" to trigger slash menu
    const blockInfo = getActiveBlock(editor)
    if (blockInfo) {
      // Move cursor to end of block and insert "/" to trigger slash menu
      editor.chain().focus().setTextSelection(blockInfo.to).insertContent('/').run()
      // Slash command hook will automatically detect "/" and open menu
    } else {
      // Fallback: insert "/" at current cursor position
      editor.chain().focus().insertContent('/').run()
    }
  }

  const handleTurnInto = (targetType: string) => {
    if (!editor) return
    turnIntoBlock(editor, targetType)
  }

  const handleDuplicate = () => {
    if (!editor) return
    duplicateBlock(editor)
  }

  const handleDelete = () => {
    if (!editor) return
    deleteBlock(editor)
  }


  // PHASE 1: Canary to prove component mounts (placed after hooks to comply with rules-of-hooks)
  if (CANARY_MODE) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          backgroundColor: 'red',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '4px',
          zIndex: 99999,
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        GUTTER CANARY
      </div>,
      document.body
    )
  }

  // PHASE 2: Only render if we have an active block and position
  // Validate activeBlockPos: must be > 0
  if (!editor || activeBlockPos === null || activeBlockPos < 0 || !position) {
    if (CANARY_MODE && editor) {
    }
    return null
  }

  if (CANARY_MODE) {
  }

  // PHASE 2: Portal to document.body with forced visibility for debugging
  // PHASE 6: Restore subtle opacity after confirming visibility
  const gutterContent = (
    <div
      ref={gutterRef}
      className="flex flex-col gap-1 group pointer-events-auto transition-opacity duration-150 hover:!opacity-100"
      style={{
        position: 'fixed', // PHASE 2: Fixed positioning
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999, // PHASE 2: High z-index to ensure visibility
        display: 'block', // PHASE 2: Force display
        visibility: 'visible', // PHASE 2: Force visibility
        opacity: 0.7, // PHASE 6: Subtle when active, fully opaque on hover via CSS
        pointerEvents: 'auto', // PHASE 2: Ensure clickable
      }}
      onMouseEnter={handleGutterMouseEnter}
      onMouseLeave={handleGutterMouseLeave}
      onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleInsertBlock}
        className="h-6 w-6 p-0 hover:bg-accent rounded transition-colors"
        title="Add block"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent rounded transition-colors"
            title="Block actions"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Turn into</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleTurnInto('paragraph')}>
                Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('heading-1')}>
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('heading-2')}>
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('heading-3')}>
                Heading 3
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('blockquote')}>
                Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('bulletList')}>
                Bulleted list
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('orderedList')}>
                Numbered list
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('taskList')}>
                Task list
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTurnInto('codeBlock')}>
                Code block
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDuplicate}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  // Portal to document.body to avoid clipping from overflow constraints
  // Use fixed positioning with viewport coordinates
  return createPortal(gutterContent, document.body)
}
