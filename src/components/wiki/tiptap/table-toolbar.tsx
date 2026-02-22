/**
 * Table Toolbar Component
 * 
 * Minimal floating toolbar for table operations
 * Appears when cursor is inside a table
 */

"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import { 
  Trash2, 
  Rows, 
  Columns,
  Minus
} from 'lucide-react'

interface TableToolbarProps {
  editor: Editor
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const updateToolbar = () => {
      if (!editor) {
        setIsVisible(false)
        return
      }

      const isInTable = editor.isActive('table')
      
      if (!isInTable) {
        setIsVisible(false)
        return
      }

      try {
        const { selection } = editor.state
        const { $anchor } = selection
        const coords = editor.view.coordsAtPos($anchor.pos)

        setPosition({
          top: coords.bottom + window.scrollY + 4,
          left: coords.left + window.scrollX,
        })
        setIsVisible(true)
      } catch (_error) {
        setIsVisible(false)
      }
    }

    // Update on selection changes
    editor.on('selectionUpdate', updateToolbar)
    editor.on('update', updateToolbar)

    // Initial check
    updateToolbar()

    return () => {
      editor.off('selectionUpdate', updateToolbar)
      editor.off('update', updateToolbar)
    }
  }, [editor])

  if (!isVisible || !position) {
    return null
  }

  const handleAddRowBelow = () => {
    (editor.chain().focus() as any).addRowAfter().run()
  }

  const handleAddColumnRight = () => {
    (editor.chain().focus() as any).addColumnAfter().run()
  }

  const handleDeleteRow = () => {
    (editor.chain().focus() as any).deleteRow().run()
  }

  const handleDeleteColumn = () => {
    (editor.chain().focus() as any).deleteColumn().run()
  }

  const handleDeleteTable = () => {
    (editor.chain().focus() as any).deleteTable().run()
  }

  const toolbarContent = (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddRowBelow}
        className="h-8 w-8 p-0"
        title="Add row below"
      >
        <Rows className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddColumnRight}
        className="h-8 w-8 p-0"
        title="Add column right"
      >
        <Columns className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeleteRow}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        title="Delete row"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeleteColumn}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        title="Delete column"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeleteTable}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        title="Delete table"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  return createPortal(toolbarContent, document.body)
}

