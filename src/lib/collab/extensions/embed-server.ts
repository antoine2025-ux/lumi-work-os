/**
 * Server-safe Embed node for Hocuspocus schema construction.
 *
 * Mirrors the ProseMirror node spec from the client Embed extension
 * (src/components/wiki/tiptap/extensions/embed.ts) but omits
 * ReactNodeViewRenderer, addCommands, and the EmbedNodeView import
 * so it can run in a plain Node process without React.
 *
 * Keep attributes in sync with the client extension.
 */
import { Node, mergeAttributes } from '@tiptap/core'

export const EmbedServer = Node.create({
  name: 'embed',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      embedUrl: { default: '' },
      provider: { default: 'generic' },
      title: { default: '' },
      width: { default: '100%' },
      height: { default: 400 },
      embedId: { default: null },
    }
  },

  parseHTML() {
    return [
      { tag: 'div[data-embed-id]' },
      { tag: 'div[data-embed-url]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'embed-placeholder' }, HTMLAttributes), 0]
  },
})
