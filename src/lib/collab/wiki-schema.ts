/**
 * Shared ProseMirror schema for the wiki editor.
 * Used for initial content injection when converting JSONContent to Yjs format.
 * Must match the extensions in tiptap-editor.tsx.
 */
import { getSchema } from '@tiptap/core'
import type { Schema } from '@tiptap/pm/model'
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
import { Embed } from '@/components/wiki/tiptap/extensions/embed'
import { SlashCommand } from '@/components/wiki/tiptap/extensions/slash-command'
import { createMentionExtension } from '@/components/wiki/tiptap/extensions/mention-suggestion'

const wikiExtensions = [
  StarterKit.configure({
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
  Image.configure({
    inline: false,
    allowBase64: false,
  }),
  Placeholder.configure({
    placeholder: "Type '/' for commands...",
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
  SlashCommand,
  createMentionExtension(),
]

let cachedSchema: Schema | null = null

/**
 * Returns the wiki editor schema (cached).
 */
export function getWikiEditorSchema(): Schema {
  if (!cachedSchema) {
    cachedSchema = getSchema(wikiExtensions)
  }
  return cachedSchema
}
