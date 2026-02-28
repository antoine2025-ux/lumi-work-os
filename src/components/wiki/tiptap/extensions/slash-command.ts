/**
 * TipTap Slash Command Extension
 * 
 * Provides slash command menu functionality (Notion-like)
 * Triggers on typing "/" at start of paragraph or after whitespace
 * 
 * Note: This is a simplified implementation that doesn't require @tiptap/suggestion
 */

import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'

export interface SlashCommandOptions {
  HTMLAttributes: Record<string, unknown>
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          'data-slash-command': {
            default: null,
            parseHTML: element => element.getAttribute('data-slash-command'),
            renderHTML: attributes => {
              if (!attributes['data-slash-command']) {
                return {}
              }
              return {
                'data-slash-command': attributes['data-slash-command'],
              }
            },
          },
        },
      },
    ]
  },
})

/**
 * Slash command items configuration
 * 
 * Each command has a stable ID to prevent menu reorder bugs
 * and make future PRs (3.2, 3.3) easier.
 */
export interface SlashCommandItem {
  id: string // Stable identifier for the command
  title: string
  description?: string
  icon?: string // Icon name (used for mapping to React component)
  keywords: string[] // Search keywords (required)
  run: (props: { editor: Editor; range?: { from: number; to: number } }) => void // Command execution function
}

/**
 * Get all slash command items with stable IDs
 * 
 * Commands are ordered by priority/usage frequency.
 * IDs are stable to prevent menu reorder bugs.
 */
export function getSlashCommandItems(): SlashCommandItem[] {
  return [
    {
      id: 'heading-1',
      title: 'Heading 1',
      description: 'Big section heading',
      icon: 'Heading1',
      keywords: ['h1', 'heading', 'title', 'heading1'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
        } else {
          editor.chain().focus().setHeading({ level: 1 }).run()
        }
      },
    },
    {
      id: 'heading-2',
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: 'Heading2',
      keywords: ['h2', 'heading', 'subtitle', 'heading2'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
        } else {
          editor.chain().focus().setHeading({ level: 2 }).run()
        }
      },
    },
    {
      id: 'heading-3',
      title: 'Heading 3',
      description: 'Small section heading',
      icon: 'Heading3',
      keywords: ['h3', 'heading', 'heading3'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
        } else {
          editor.chain().focus().setHeading({ level: 3 }).run()
        }
      },
    },
    {
      id: 'bulleted-list',
      title: 'Bulleted List',
      description: 'Create a bulleted list',
      icon: 'List',
      keywords: ['ul', 'bullet', 'list', 'bulleted'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        } else {
          editor.chain().focus().toggleBulletList().run()
        }
      },
    },
    {
      id: 'numbered-list',
      title: 'Numbered List',
      description: 'Create a numbered list',
      icon: 'ListOrdered',
      keywords: ['ol', 'numbered', 'ordered', 'list', 'number'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        } else {
          editor.chain().focus().toggleOrderedList().run()
        }
      },
    },
    {
      id: 'quote',
      title: 'Quote',
      description: 'Create a quote block',
      icon: 'Quote',
      keywords: ['quote', 'blockquote', 'citation'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        } else {
          editor.chain().focus().toggleBlockquote().run()
        }
      },
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Insert a horizontal divider',
      icon: 'Minus',
      keywords: ['hr', 'horizontal', 'rule', 'divider', 'line'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        } else {
          editor.chain().focus().setHorizontalRule().run()
        }
      },
    },
    {
      id: 'code-block',
      title: 'Code Block',
      description: 'Insert a code block',
      icon: 'Code',
      keywords: ['code', 'pre', 'snippet', 'codeblock'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).setCodeBlock().run()
        } else {
          editor.chain().focus().setCodeBlock().run()
        }
      },
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Insert a table',
      icon: 'Table',
      keywords: ['table', 'grid', 'rows', 'columns'],
      run: ({ editor, range }) => {
        if (range) {
          (editor.chain().focus().deleteRange(range) as unknown as { insertTable: (o: { rows: number; cols: number; withHeaderRow: boolean }) => { run: () => boolean } })
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        } else {
          (editor.chain().focus() as unknown as { insertTable: (o: { rows: number; cols: number; withHeaderRow: boolean }) => { run: () => boolean } })
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      },
    },
    {
      id: 'task-list',
      title: 'Task List',
      description: 'Create a task list with checkboxes',
      icon: 'CheckSquare',
      keywords: ['task', 'todo', 'checkbox', 'checklist'],
      run: ({ editor, range }) => {
        const taskListContent = {
          type: 'taskList' as const,
          content: [
            {
              type: 'taskItem' as const,
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph' as const,
                },
              ],
            },
          ],
        }

        if (range) {
          // Delete the "/query" text and insert task list
          // TipTap's insertContent automatically places cursor inside the inserted content
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(taskListContent)
            .run()
        } else {
          // Insert task list at current position
          editor
            .chain()
            .focus()
            .insertContent(taskListContent)
            .run()
        }
      },
    },
    {
      id: 'image',
      title: 'Image',
      description: 'Upload an image or PDF',
      icon: 'Image',
      keywords: ['image', 'img', 'photo', 'picture', 'upload', 'pdf'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).run()
        }
        window.dispatchEvent(new CustomEvent('wiki:trigger-image-upload'))
      },
    },
    {
      id: 'embed',
      title: 'Embed',
      description: 'Embed a URL (YouTube, Figma, Loom...)',
      icon: 'FileText',
      keywords: ['embed', 'iframe', 'media', 'url'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).run()
        }
        window.dispatchEvent(
          new CustomEvent('wiki:open-embed-dialog', { detail: {} })
        )
      },
    },
    {
      id: 'youtube',
      title: 'YouTube',
      description: 'Embed a YouTube video',
      icon: 'Youtube',
      keywords: ['youtube', 'video', 'embed'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).run()
        }
        window.dispatchEvent(
          new CustomEvent('wiki:open-embed-dialog', {
            detail: { provider: 'youtube' },
          })
        )
      },
    },
    {
      id: 'figma',
      title: 'Figma',
      description: 'Embed a Figma design or prototype',
      icon: 'Figma',
      keywords: ['figma', 'design', 'embed'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).run()
        }
        window.dispatchEvent(
          new CustomEvent('wiki:open-embed-dialog', {
            detail: { provider: 'figma' },
          })
        )
      },
    },
    {
      id: 'loom',
      title: 'Loom',
      description: 'Embed a Loom video',
      icon: 'Video',
      keywords: ['loom', 'video', 'embed'],
      run: ({ editor, range }) => {
        if (range) {
          editor.chain().focus().deleteRange(range).run()
        }
        window.dispatchEvent(
          new CustomEvent('wiki:open-embed-dialog', {
            detail: { provider: 'loom' },
          })
        )
      },
    },
  ]
}

