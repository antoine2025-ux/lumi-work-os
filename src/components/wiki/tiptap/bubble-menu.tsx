/**
 * Bubble Menu Component
 * 
 * Floating formatting toolbar that appears when text is selected
 * Expanded with underline, strikethrough, link editing, and "Turn into" options
 */

"use client"

import { BubbleMenu as TipTapBubbleMenu } from '@tiptap/react/menus'
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
import { useEffect } from 'react'
import { 
  Bold, 
  Italic, 
  Code, 
  Link as LinkIcon,
  Underline,
  Strikethrough,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { turnIntoBlock } from './commands/block-commands'

interface BubbleMenuProps {
  editor: Editor | null
  onEscape?: () => void
}

export function BubbleMenu({ editor, onEscape }: BubbleMenuProps) {
  // Handle Escape key — must be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, onEscape])

  if (!editor) {
    return null
  }

  const handleLinkClick = () => {
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
  }

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  const handleTurnInto = (targetType: string) => {
    turnIntoBlock(editor, targetType)
  }

  return (
    <TipTapBubbleMenu
      editor={editor}
      className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
      shouldShow={({ editor, view, state, oldState, from, to }) => {
        // Only show when there's a text selection (not collapsed)
        return from !== to && !editor.isActive('table')
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('bold') && 'bg-accent text-accent-foreground'
        )}
        title="Bold (Cmd+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('italic') && 'bg-accent text-accent-foreground'
        )}
        title="Italic (Cmd+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('underline') && 'bg-accent text-accent-foreground'
        )}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('strike') && 'bg-accent text-accent-foreground'
        )}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('code') && 'bg-accent text-accent-foreground'
        )}
        title="Code"
      >
        <Code className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('link') && 'bg-accent text-accent-foreground'
            )}
            title="Link (Cmd+K)"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {editor.isActive('link') ? (
            <>
              <DropdownMenuItem onClick={handleLinkClick}>
                Edit link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemoveLink} className="text-destructive">
                Remove link
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleLinkClick}>
              Add link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="h-6 w-px bg-border mx-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Turn into"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
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
        </DropdownMenuContent>
      </DropdownMenu>
    </TipTapBubbleMenu>
  )
}

