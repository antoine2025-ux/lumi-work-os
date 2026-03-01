"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import styles from './tiptap-editor.module.css'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { lowlight } from 'lowlight'
import { JSONContent, Editor } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { getUserColor } from '@/lib/collab/user-colors'
import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { ImagePlus, Code2 } from 'lucide-react'
import { Embed } from './tiptap/extensions/embed'
import { SlashCommand } from './tiptap/extensions/slash-command'
import { createMentionExtension } from './tiptap/extensions/mention-suggestion'
import { useSlashCommand } from './tiptap/use-slash-command'
import { SlashCommandMenu } from './tiptap/slash-command-menu'
import { TableToolbar } from './tiptap/table-toolbar'
import { BubbleMenu } from './tiptap/bubble-menu'
import { BlockGutter } from './tiptap/blocks/block-gutter'
import { useKeyboardShortcuts } from './tiptap/hooks/use-keyboard-shortcuts'
import { getActiveBlock } from './tiptap/ui/block-targeting'
import { extractTextFromProseMirror } from '@/lib/wiki/text-extract'
import { parseEmbedUrl, isEmbeddableUrl } from '@/lib/wiki/embed-utils'
import { EmbedDialog } from './tiptap/EmbedDialog'
import { PasteEmbedPrompt } from './tiptap/PasteEmbedPrompt'
import { uploadWikiFile } from './tiptap/hooks/use-wiki-upload'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const PDF_MIME = 'application/pdf'

function isImageFile(file: File): boolean {
  return IMAGE_MIMES.includes(file.type)
}

function isPdfFile(file: File): boolean {
  return file.type === PDF_MIME
}

interface TipTapEditorProps {
  content: JSONContent | null
  onChange: (json: JSONContent) => void
  placeholder?: string
  editable?: boolean
  className?: string
  onEditorReady?: (editor: Editor) => void
  pageId?: string
  /** When set, enables real-time collaboration; content comes from Yjs */
  collabProvider?: HocuspocusProvider | null
  /** User name for collaboration cursor (when collabProvider is set) */
  collabUserName?: string
  /** User id for collaboration cursor color (when collabProvider is set) */
  collabUserId?: string
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
  onEditorReady,
  pageId,
  collabProvider,
  collabUserName = 'User',
  collabUserId = 'anonymous',
}: TipTapEditorProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false)
  const [embedDialogProvider, setEmbedDialogProvider] = useState<
    'youtube' | 'figma' | 'loom' | undefined
  >(undefined)
  const [pendingPaste, setPendingPaste] = useState<{
    url: string
    position: { top: number; left: number }
  } | null>(null)
  const setPendingPasteRef = useRef(setPendingPaste)
  useEffect(() => {
    setPendingPasteRef.current = setPendingPaste
  }, [])

  const isCollab = !!collabProvider

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Exclude codeBlock, link, and underline since we're using custom versions
        codeBlock: false,
        link: false,
        underline: false,
        // Collaboration provides its own undo/redo
        ...(isCollab ? { undoRedo: false as const } : {}),
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: false, // TODO [BACKLOG]: Enable nested task lists
      }),
      Table.configure({
        resizable: false, // TODO [BACKLOG]: Enable table column resizing
      }),
      TableRow,
      TableHeader,
      TableCell,
      Embed,
      SlashCommand,
      createMentionExtension(),
      ...(isCollab && collabProvider
        ? [
            Collaboration.configure({
              document: collabProvider.document,
            }),
            CollaborationCaret.configure({
              provider: collabProvider,
              user: {
                id: collabUserId,
                name: collabUserName,
                color: getUserColor(collabUserId),
              },
            }),
          ]
        : []),
    ],
    [placeholder, isCollab, collabProvider, collabUserName, collabUserId]
  )

  const editorRefForHandlers = useRef<Editor | null>(null)

  const processFiles = useCallback(
    async (files: File[], editorInstance: Editor) => {
      const imageFiles = files.filter(isImageFile)
      const pdfFiles = files.filter(isPdfFile)
      const toProcess = [...imageFiles, ...pdfFiles]
      if (toProcess.length === 0) return

      for (const file of toProcess) {
        try {
          const result = await uploadWikiFile(file, pageId)
          if (isImageFile(file)) {
            editorInstance
              .chain()
              .focus()
              .setImage({ src: result.url, alt: result.filename })
              .run()
          } else if (isPdfFile(file)) {
            editorInstance
              .chain()
              .focus()
              .insertContent({
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'link', attrs: { href: result.url } }],
                    text: result.filename,
                  },
                ],
              })
              .run()
          }
        } catch (err) {
          toast({
            title: 'Upload failed',
            description: err instanceof Error ? err.message : 'Could not upload file',
            variant: 'destructive',
          })
        }
      }
    },
    [pageId, toast]
  )

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatches
    extensions,
    content: isCollab
      ? undefined // Content comes from Yjs
      : content || {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-slate max-w-none focus:outline-none min-h-[200px] p-4 ${className}`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          const files: File[] = []
          for (let i = 0; i < items.length; i++) {
            const file = items[i]?.getAsFile()
            if (file && (isImageFile(file) || isPdfFile(file))) {
              files.push(file)
            }
          }
          if (files.length > 0) {
            event.preventDefault()
            const ed = editorRefForHandlers.current
            if (ed) processFiles(files, ed)
            return true
          }
        }
        const text = event.clipboardData?.getData('text/plain')
        if (text && isEmbeddableUrl(text)) {
          event.preventDefault()
          const pos = view.state.selection.from
          const coords = view.coordsAtPos(pos)
          setPendingPasteRef.current?.({
            url: text.trim(),
            position: {
              top: coords.bottom + window.scrollY + 4,
              left: coords.left + window.scrollX,
            },
          })
          return true
        }
        return false
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        const fileList: File[] = Array.from(files).filter(
          (f) => isImageFile(f) || isPdfFile(f)
        )
        if (fileList.length > 0) {
          event.preventDefault()
          const ed = editorRefForHandlers.current
          if (ed) processFiles(fileList, ed)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  useEffect(() => {
    editorRefForHandlers.current = editor
  }, [editor])

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
  // Skip when collab is active — content comes from Yjs
  useEffect(() => {
    if (!editor || !content || isCollab) return
    
    const currentJSON = editor.getJSON()
    // Only update if content actually changed (avoid infinite loops)
    if (JSON.stringify(currentJSON) !== JSON.stringify(content)) {
      // Guard: don't overwrite editor content with empty doc when editor has text
      // Prevents race where stale/empty content prop would erase user content
      const incomingText = extractTextFromProseMirror(content)
      const currentText = extractTextFromProseMirror(currentJSON)
      if (!incomingText.trim() && currentText.trim()) {
        return // Keep editor content; incoming is empty, editor has text
      }
      editor.commands.setContent(content)
    }
  }, [content, editor, isCollab])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0 || !editor) return
      const fileList = Array.from(files).filter(
        (f) => isImageFile(f) || isPdfFile(f)
      )
      if (fileList.length > 0) {
        await processFiles(fileList, editor)
      }
      e.target.value = ''
    },
    [editor, processFiles]
  )

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  useEffect(() => {
    const handler = () => triggerFileInput()
    window.addEventListener('wiki:trigger-image-upload', handler)
    return () => window.removeEventListener('wiki:trigger-image-upload', handler)
  }, [triggerFileInput])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ provider?: 'youtube' | 'figma' | 'loom' }>)
        .detail
      setEmbedDialogProvider(detail?.provider)
      setEmbedDialogOpen(true)
    }
    window.addEventListener('wiki:open-embed-dialog', handler)
    return () => window.removeEventListener('wiki:open-embed-dialog', handler)
  }, [])

  const handlePasteEmbed = useCallback(() => {
    if (!editor || !pendingPaste) return
    const result = parseEmbedUrl(pendingPaste.url)
    if (result) {
      editor
        .chain()
        .focus()
        .setEmbed({
          src: result.src,
          embedUrl: result.embedUrl,
          provider: result.provider,
          title: result.title,
        })
        .run()
    }
    setPendingPaste(null)
  }, [editor, pendingPaste])

  const handlePasteKeepAsLink = useCallback(() => {
    if (!editor || !pendingPaste) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: pendingPaste.url,
            marks: [{ type: 'link', attrs: { href: pendingPaste.url } }],
          },
        ],
      })
      .run()
    setPendingPaste(null)
  }, [editor, pendingPaste])

  const handlePasteDismiss = useCallback(() => {
    if (!editor || !pendingPaste) return
    editor.chain().focus().insertContent(pendingPaste.url).run()
    setPendingPaste(null)
  }, [editor, pendingPaste])

  if (!editor) {
    return (
      <div className="min-h-[200px] p-4 border rounded-lg bg-muted/50 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    )
  }

  // Handle insert block from gutter
  const handleInsertBlock = (_position: { top: number; left: number }) => {
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
      {editable && (
        <div className="flex items-center gap-1 mb-2 px-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={triggerFileInput}
            title="Upload image or PDF"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEmbedDialogProvider(undefined)
              setEmbedDialogOpen(true)
            }}
            title="Embed (YouTube, Figma, Loom...)"
          >
            <Code2 className="h-4 w-4" />
          </Button>
        </div>
      )}
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
      <EmbedDialog
        open={embedDialogOpen}
        onClose={() => setEmbedDialogOpen(false)}
        editor={editor}
        initialProvider={embedDialogProvider}
      />
      {pendingPaste && (
        <PasteEmbedPrompt
          url={pendingPaste.url}
          position={pendingPaste.position}
          onEmbed={handlePasteEmbed}
          onKeepAsLink={handlePasteKeepAsLink}
          onDismiss={handlePasteDismiss}
        />
      )}
    </div>
  )
}

