/**
 * Read-only view for TipTap JSON content
 * Renders JSON content as HTML using TipTap's renderer
 */

"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
// @ts-ignore - TipTap extension types
import TaskList from '@tiptap/extension-task-list'
// @ts-ignore - TipTap extension types
import TaskItem from '@tiptap/extension-task-item'
// @ts-ignore - TipTap extension types
import Table from '@tiptap/extension-table'
// @ts-ignore - TipTap extension types
import TableRow from '@tiptap/extension-table-row'
// @ts-ignore - TipTap extension types
import TableCell from '@tiptap/extension-table-cell'
// @ts-ignore - TipTap extension types
import TableHeader from '@tiptap/extension-table-header'
import { lowlight } from 'lowlight'
import styles from './tiptap-editor.module.css'
import { JSONContent } from '@tiptap/core'
import { useEffect } from 'react'
import { Embed } from './tiptap/extensions/embed'

interface WikiReadViewProps {
  content: JSONContent | null
  className?: string
}

/**
 * Read-only renderer for TipTap JSON content
 * Uses TipTap editor in non-editable mode to render content
 */
export function WikiReadView({ content, className = "" }: WikiReadViewProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Exclude codeBlock, link, and underline to avoid duplicates
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: false,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Embed,
    ],
    content: content || {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
    editable: false, // Read-only
    editorProps: {
      attributes: {
        class: `prose prose-slate max-w-none focus:outline-none min-h-[200px] p-4 ${className}`,
      },
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (!editor || !content) return
    
    const currentJSON = editor.getJSON()
    // Only update if content actually changed
    if (JSON.stringify(currentJSON) !== JSON.stringify(content)) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="min-h-[200px] p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div className={styles.editor}>
      <div className="prose prose-foreground max-w-none min-h-[400px] dark:prose-invert">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

