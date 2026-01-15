/**
 * Keyboard Shortcuts Hook
 * 
 * Handles keyboard shortcuts for the TipTap editor:
 * - Cmd/Ctrl+B = Bold
 * - Cmd/Ctrl+I = Italic
 * - Cmd/Ctrl+K = Link
 * - Escape = Close menus
 */

import { useEffect } from 'react'
import { Editor } from '@tiptap/core'

interface UseKeyboardShortcutsProps {
  editor: Editor | null
  onEscape?: () => void
}

export function useKeyboardShortcuts({ editor, onEscape }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close menus
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape()
        }
        return
      }

      // Cmd/Ctrl+B = Bold
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        editor.chain().focus().toggleBold().run()
        return
      }

      // Cmd/Ctrl+I = Italic
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        editor.chain().focus().toggleItalic().run()
        return
      }

      // Cmd/Ctrl+K = Link
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (editor.isActive('link')) {
          // Edit existing link
          const url = editor.getAttributes('link').href
          const newUrl = window.prompt('Edit URL:', url || '')
          if (newUrl === null) {
            return
          }
          if (newUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
          } else if (newUrl) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: newUrl }).run()
          }
        } else {
          // Add new link
          const url = window.prompt('Enter URL:', '')
          if (url === null || url === '') {
            return
          }
          editor.chain().focus().setLink({ href: url }).run()
        }
        return
      }
    }

    // Only attach listener when editor is focused
    const editorElement = editor.view.dom
    editorElement.addEventListener('keydown', handleKeyDown)

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, onEscape])
}
