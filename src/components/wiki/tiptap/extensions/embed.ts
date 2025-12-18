/**
 * TipTap Embed Node Extension
 * 
 * Renders embed placeholders in the editor
 * Used for legacy HTML embed placeholders converted to JSON format
 */

import { Node, mergeAttributes } from '@tiptap/core'

export interface EmbedOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      /**
       * Insert an embed node
       */
      setEmbed: (options: { embedId: string }) => ReturnType
    }
  }
}

export const Embed = Node.create<EmbedOptions>({
  name: 'embed',

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      embedId: {
        default: null,
        parseHTML: element => element.getAttribute('data-embed-id'),
        renderHTML: attributes => {
          if (!attributes.embedId) {
            return {}
          }
          return {
            'data-embed-id': attributes.embedId
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed-id]',
        getAttrs: element => {
          const embedId = typeof element === 'string' 
            ? null 
            : element.getAttribute('data-embed-id')
          
          if (!embedId) {
            return false
          }

          return { embedId }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const embedId = HTMLAttributes['data-embed-id'] || HTMLAttributes.embedId
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        class: 'embed-placeholder',
        'data-embed-id': embedId
      }),
      `Embed: ${embedId || 'unknown'}`
    ]
  },

  addCommands() {
    return {
      setEmbed: (options: { embedId: string }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            embedId: options.embedId
          }
        })
      }
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = 'embed-placeholder border border-gray-300 rounded p-4 bg-gray-50 my-2'
      dom.setAttribute('data-embed-id', node.attrs.embedId || '')
      
      const embedId = node.attrs.embedId || 'unknown'
      dom.textContent = `Embed: ${embedId}`
      
      return {
        dom
      }
    }
  }
})

