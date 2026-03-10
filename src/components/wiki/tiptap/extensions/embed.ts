/**
 * TipTap Embed Node Extension
 *
 * Renders embedded content (YouTube, Figma, Loom, Google Docs/Sheets, generic iframes)
 * with click-to-load, provider bar, and backward compatibility for legacy embedId placeholders
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { EmbedNodeView } from './EmbedNodeView'
import type { EmbedProvider } from '@/lib/wiki/embed-utils'

export interface EmbedOptions {
  HTMLAttributes: Record<string, unknown>
}

export interface SetEmbedAttrs {
  src: string
  embedUrl: string
  provider: string
  title?: string
  width?: string
  height?: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      /**
       * Insert an embed node with URL and provider
       */
      setEmbed: (options: SetEmbedAttrs) => ReturnType
      /**
       * Insert a legacy embed placeholder (backward compat)
       */
      setEmbedLegacy: (options: { embedId: string }) => ReturnType
    }
  }
}

export const Embed = Node.create<EmbedOptions>({
  name: 'embed',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-embed-src') ?? '',
        renderHTML: (attrs) =>
          attrs.src ? { 'data-embed-src': attrs.src } : {},
      },
      embedUrl: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-embed-url') ?? '',
        renderHTML: (attrs) =>
          attrs.embedUrl ? { 'data-embed-url': attrs.embedUrl } : {},
      },
      provider: {
        default: 'generic',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-embed-provider') ?? 'generic',
        renderHTML: (attrs) => ({
          'data-embed-provider': attrs.provider ?? 'generic',
        }),
      },
      title: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-embed-title') ?? '',
        renderHTML: (attrs) =>
          attrs.title ? { 'data-embed-title': attrs.title } : {},
      },
      width: {
        default: '100%',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-embed-width') ?? '100%',
        renderHTML: (attrs) => ({
          'data-embed-width': attrs.width ?? '100%',
        }),
      },
      height: {
        default: 400,
        parseHTML: (el) => {
          const h = (el as HTMLElement).getAttribute('data-embed-height')
          return h ? parseInt(h, 10) : 400
        },
        renderHTML: (attrs) => ({
          'data-embed-height': String(attrs.height ?? 400),
        }),
      },
      embedId: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-embed-id'),
        renderHTML: (attrs) =>
          attrs.embedId ? { 'data-embed-id': attrs.embedId } : {},
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed-id]',
        getAttrs: (el) => {
          const element = el as HTMLElement
          const embedId = element.getAttribute('data-embed-id')
          if (!embedId) return false
          return {
            embedId,
            src: '',
            embedUrl: '',
            provider: 'generic',
            title: '',
          }
        },
      },
      {
        tag: 'div[data-embed-url]',
        getAttrs: (el) => {
          const element = el as HTMLElement
          const embedUrl = element.getAttribute('data-embed-url')
          const src = element.getAttribute('data-embed-src') ?? embedUrl ?? ''
          if (!embedUrl) return false
          return {
            embedUrl,
            src: src || embedUrl,
            provider:
              (element.getAttribute('data-embed-provider') as EmbedProvider) ??
              'generic',
            title: element.getAttribute('data-embed-title') ?? '',
            width: element.getAttribute('data-embed-width') ?? '100%',
            height: parseInt(
              element.getAttribute('data-embed-height') ?? '400',
              10
            ),
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs
    const embedId = attrs.embedId
    const embedUrl = attrs.embedUrl

    if (embedId && !embedUrl) {
      return [
        'div',
        mergeAttributes(this.options.HTMLAttributes, {
          class: 'embed-placeholder',
          'data-embed-id': embedId,
        }),
        `Embed: ${embedId}`,
      ]
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        class: 'embed-placeholder',
        'data-embed-src': attrs.src,
        'data-embed-url': attrs.embedUrl,
        'data-embed-provider': attrs.provider ?? 'generic',
        'data-embed-title': attrs.title ?? '',
        'data-embed-width': attrs.width ?? '100%',
        'data-embed-height': String(attrs.height ?? 400),
      }),
      `Embed: ${attrs.title || attrs.provider || 'embed'}`,
    ]
  },

  addCommands() {
    return {
      setEmbed:
        (options: SetEmbedAttrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              embedUrl: options.embedUrl,
              provider: options.provider,
              title: options.title ?? '',
              width: options.width ?? '100%',
              height: options.height ?? 400,
            },
          }),
      setEmbedLegacy:
        (options: { embedId: string }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { embedId: options.embedId },
          }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView)
  },
})
