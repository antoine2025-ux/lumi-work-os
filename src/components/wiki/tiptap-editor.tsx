"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import styles from './tiptap-editor.module.css'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
// @ts-ignore - TipTap extension types
import TaskList from '@tiptap/extension-task-list'
// @ts-ignore - TipTap extension types
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { lowlight } from 'lowlight'
import { JSONContent, Editor } from '@tiptap/core'
import { useEffect } from 'react'
import { Embed } from './tiptap/extensions/embed'
import { SlashCommand } from './tiptap/extensions/slash-command'
import { useSlashCommand } from './tiptap/use-slash-command'
import { SlashCommandMenu } from './tiptap/slash-command-menu'
import { TableToolbar } from './tiptap/table-toolbar'
import { BubbleMenu } from './tiptap/bubble-menu'
import { BlockGutter } from './tiptap/blocks/block-gutter'
import { useKeyboardShortcuts } from './tiptap/hooks/use-keyboard-shortcuts'
import { getActiveBlock } from './tiptap/ui/block-targeting'

interface TipTapEditorProps {
  content: JSONContent | null
  onChange: (json: JSONContent) => void
  placeholder?: string
  editable?: boolean
  className?: string
  onEditorReady?: (editor: Editor) => void
}

/**
 * TipTap editor component for structured document editing
 * Uses ProseMirror JSON format for content storage
 */
export function TipTapEditor({
  content,
  onChange,
  placeholder = "Type '/' for commands...",
  editable = true,
  className = "",
  onEditorReady
}: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatches
    extensions: [
      StarterKit.configure({
        // Exclude codeBlock, link, and underline since we're using custom versions
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: false, // MVP: Keep simple, no indentation for now
        // Note: Can enable nested: true later when Tab/Shift+Tab indentation is implemented
      }),
      Table.configure({
        resizable: false, // MVP: Keep simple, no resizing
      }),
      TableRow,
      TableHeader,
      TableCell,
      Embed,
      SlashCommand,
    ],
    content: content || {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-slate max-w-none focus:outline-none min-h-[200px] p-4 ${className}`,
      },
      // Let TipTap handle paste automatically (preserves formatting from external sources)
      handlePaste: (view, event) => {
        // TipTap will handle HTML paste automatically
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  // Slash command menu hook
  const slashCommand = useSlashCommand(editor)

  // Keyboard shortcuts
  const handleEscape = () => {
    slashCommand.closeMenu()
  }
  useKeyboardShortcuts({ editor, onEscape: handleEscape })

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  // Update editor content when prop changes (but not during editing)
  useEffect(() => {
    if (!editor || !content) return
    
    const currentJSON = editor.getJSON()
    // Only update if content actually changed (avoid infinite loops)
    if (JSON.stringify(currentJSON) !== JSON.stringify(content)) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="min-h-[200px] p-4 border rounded-lg bg-muted/50 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    )
  }

  // Handle insert block from gutter
  const handleInsertBlock = (position: { top: number; left: number }) => {
    if (!editor) return
    
    // Get current block and move cursor to end
    const blockInfo = editor ? getActiveBlock(editor) : null
    if (blockInfo) {
      // Move cursor to end of block and insert "/" to trigger slash menu
      editor.chain().focus().setTextSelection(blockInfo.to).insertContent('/').run()
      // Slash command hook will automatically detect "/" and open menu
    }
  }

  return (
    <div className={styles.editor}>
      <EditorContent editor={editor} />
      {editor && editable && (
        <>
          <BubbleMenu editor={editor} onEscape={handleEscape} />
          <BlockGutter editor={editor} onInsertBlock={handleInsertBlock} />
        </>
      )}
      {slashCommand.isOpen && (
        <SlashCommandMenu
          items={slashCommand.items}
          command={slashCommand.executeCommand}
          position={slashCommand.position}
          isOpen={slashCommand.isOpen}
          onClose={slashCommand.closeMenu}
        />
      )}
      {editor && <TableToolbar editor={editor} />}
    </div>
  )
}

