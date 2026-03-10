/**
 * Server-side ProseMirror schema for Hocuspocus.
 *
 * Uses server-safe extension stubs (no React / "use client" deps) so the
 * schema can be constructed inside a plain Node process (start-collab-server.ts).
 *
 * Uses CodeBlock (not CodeBlockLowlight) to avoid lowlight module resolution issues.
 * Must match node types from the client editor for JSON ↔ Yjs conversion to work.
 */
import { getSchema } from '@tiptap/core'
import type { Schema } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { SlashCommand } from '@/components/wiki/tiptap/extensions/slash-command'
import { EmbedServer } from './extensions/embed-server'
import { MentionServer } from './extensions/mention-server'

const serverExtensions = [
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
  CodeBlock,
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
  EmbedServer,
  SlashCommand,
  MentionServer,
]

let cachedSchema: Schema | null = null

export function getWikiEditorSchema(): Schema {
  if (!cachedSchema) {
    cachedSchema = getSchema(serverExtensions)
  }
  return cachedSchema
}
