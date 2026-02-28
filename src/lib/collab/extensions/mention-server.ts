/**
 * Server-safe Mention node for Hocuspocus schema construction.
 *
 * Mirrors the ProseMirror node spec produced by @tiptap/extension-mention
 * as configured in src/components/wiki/tiptap/extensions/mention-suggestion.tsx,
 * but omits the suggestion plugin, React rendering, and "use client" deps
 * so it can run in a plain Node process.
 *
 * Keep attributes in sync with the client extension.
 */
import Mention from '@tiptap/extension-mention'

export const MentionServer = Mention.configure({
  HTMLAttributes: {
    class: 'mention',
    'data-type': 'mention',
  },
  renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
  renderHTML: ({ node }) => [
    'span',
    {
      'data-type': 'mention',
      'data-id': node.attrs.id,
      'data-label': node.attrs.label,
      class: 'mention',
    },
    `@${node.attrs.label ?? node.attrs.id}`,
  ],
})
