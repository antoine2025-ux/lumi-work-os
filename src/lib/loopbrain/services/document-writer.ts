/**
 * LoopbrainDocumentWriter — server-side Hocuspocus client for writing
 * TipTap/ProseMirror content into a wiki page's Yjs document.
 *
 * Connects as a real-time collaborator so all connected editors see
 * insertions appear live, exactly as if another user were typing.
 *
 * Approach: @hocuspocus/provider with `ws` WebSocketPolyfill (Node.js safe).
 * Manipulates the Yjs XmlFragment ('default') directly using Y.XmlElement /
 * Y.XmlText — matching the y-prosemirror mapping that TipTap Collaboration
 * reads from.
 */
import * as Y from 'yjs'
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import WS from 'ws'

const CONNECTION_TIMEOUT_MS = 5_000

// ---------------------------------------------------------------------------
// ProseMirror JSON types (subset used for content insertion)
// ---------------------------------------------------------------------------

export interface ProseMirrorMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface ProseMirrorNodeJSON {
  type: string
  attrs?: Record<string, unknown>
  content?: ProseMirrorNodeJSON[]
  text?: string
  marks?: ProseMirrorMark[]
}

// ---------------------------------------------------------------------------
// LoopbrainDocumentWriter
// ---------------------------------------------------------------------------

export class LoopbrainDocumentWriter {
  private wsProvider: HocuspocusProviderWebsocket | null = null
  private provider: HocuspocusProvider | null = null
  private doc: Y.Doc
  private connected = false

  constructor() {
    this.doc = new Y.Doc()
  }

  /**
   * Connect to a wiki page's Yjs document via Hocuspocus.
   *
   * @param pageId  The wiki page UUID — document name will be `wiki-${pageId}`
   * @param authToken  Auth token for Hocuspocus (service secret for server-to-server)
   * @throws Error on timeout (5 s), authentication failure, or connection close
   */
  async connect(pageId: string, authToken?: string): Promise<void> {
    const collabUrl = process.env.COLLAB_URL || process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234'
    
    // Use service secret for server-to-server authentication
    const token = authToken || process.env.COLLAB_SERVICE_SECRET
    
    if (!token) {
      throw new Error('No authentication token or service secret available')
    }

    return new Promise<void>((resolve, reject) => {
      let settled = false

      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        this.disconnect()
        reject(new Error(`Hocuspocus connection timeout after ${CONNECTION_TIMEOUT_MS}ms`))
      }, CONNECTION_TIMEOUT_MS)

      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        fn()
      }

      // Create provider with inline WebSocket configuration
      // WebSocketPolyfill and maxAttempts are valid runtime options but not in the
      // TypeScript union type, so we use 'any' for the config object
      this.provider = new HocuspocusProvider({
        url: collabUrl,
        name: `wiki-${pageId}`,
        token: token,
        document: this.doc,
        WebSocketPolyfill: WS,
        maxAttempts: 1,
        onSynced: () => {
          settle(() => {
            this.connected = true
            resolve()
          })
        },
        onAuthenticationFailed: ({ reason }: { reason: string }) => {
          settle(() => {
            this.disconnect()
            reject(new Error(`Hocuspocus authentication failed: ${reason}`))
          })
        },
        onClose: ({ event }: { event?: { reason?: string } }) => {
          settle(() => {
            reject(new Error(`Hocuspocus connection closed: ${event?.reason || 'unknown'}`))
          })
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    })
  }

  // -------------------------------------------------------------------------
  // Content insertion — all methods operate within a single Yjs transaction
  // so remote clients receive one atomic update.
  // -------------------------------------------------------------------------

  /**
   * Insert one or more ProseMirror JSON nodes at the end of the document.
   */
  async insertContent(nodes: ProseMirrorNodeJSON | ProseMirrorNodeJSON[]): Promise<void> {
    this.assertConnected()
    const fragment = this.getFragment()
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes]

    this.doc.transact(() => {
      for (const node of nodeArray) {
        const xmlNode = prosemirrorNodeToYXml(node)
        if (xmlNode) {
          // Yjs types default XmlElement generic to string-only attrs, but
          // y-prosemirror stores numbers/objects. Runtime handles it fine.
          fragment.push([xmlNode as Y.XmlElement | Y.XmlText])
        }
      }
    })
  }

  /**
   * Insert a heading at the end of the document.
   */
  async insertHeading(text: string, level: 1 | 2 | 3): Promise<void> {
    return this.insertContent({
      type: 'heading',
      attrs: { level },
      content: [{ type: 'text', text }],
    })
  }

  /**
   * Insert a paragraph at the end of the document.
   * Pass empty string for a blank line.
   */
  async insertParagraph(text: string): Promise<void> {
    return this.insertContent({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : undefined,
    })
  }

  /**
   * Insert a bullet list at the end of the document.
   */
  async insertBulletList(items: string[]): Promise<void> {
    return this.insertContent({
      type: 'bulletList',
      content: items.map((item) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: item }],
          },
        ],
      })),
    })
  }

  /**
   * Disconnect from Hocuspocus and clean up resources.
   * Safe to call multiple times.
   */
  async disconnect(): Promise<void> {
    this.connected = false
    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
    if (this.wsProvider) {
      this.wsProvider.destroy()
      this.wsProvider = null
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private getFragment(): Y.XmlFragment {
    // 'default' is the fragment name used by TipTap Collaboration extension
    return this.doc.getXmlFragment('default')
  }

  private assertConnected(): void {
    if (!this.connected || !this.provider) {
      throw new Error('Not connected to Hocuspocus. Call connect() first.')
    }
  }
}

// ---------------------------------------------------------------------------
// ProseMirror JSON → Yjs XML conversion
//
// Mirrors the mapping used by y-prosemirror so TipTap reads the result
// correctly:
//   ProseMirror element node  → Y.XmlElement(nodeType)  + attrs
//   ProseMirror text node     → Y.XmlText with formatting attributes (marks)
//   Node attributes           → XmlElement.setAttribute()
//   Text marks                → insert() formatting parameter
// ---------------------------------------------------------------------------

// ProseMirror attrs can be strings, numbers, booleans, or objects (e.g. heading
// level: 2). y-prosemirror stores them as-is via setAttribute. The Yjs
// XmlElement types default to string-only, so we widen the attribute map.
type XmlAttrValue = string | number | boolean | null | object

type YXmlNode = Y.XmlElement<Record<string, XmlAttrValue>> | Y.XmlText

function prosemirrorNodeToYXml(node: ProseMirrorNodeJSON): YXmlNode | null {
  // Text nodes → Y.XmlText with mark formatting
  if (node.type === 'text' && node.text != null) {
    const ytext = new Y.XmlText()

    const formatting: Record<string, Record<string, unknown> | null> = {}
    if (node.marks) {
      for (const mark of node.marks) {
        // y-prosemirror stores mark.attrs directly (empty object for attrs-less marks)
        formatting[mark.type] = mark.attrs ?? null
      }
    }

    ytext.insert(
      0,
      node.text,
      Object.keys(formatting).length > 0 ? formatting : undefined,
    )
    return ytext
  }

  // Element nodes → Y.XmlElement (widened attribute types for y-prosemirror compat)
  const el = new Y.XmlElement(node.type) as Y.XmlElement<Record<string, XmlAttrValue>>

  if (node.attrs) {
    for (const [key, value] of Object.entries(node.attrs)) {
      if (value != null) {
        el.setAttribute(key, value as XmlAttrValue)
      }
    }
  }

  if (node.content) {
    const children: YXmlNode[] = []
    for (const child of node.content) {
      const xmlChild = prosemirrorNodeToYXml(child)
      if (xmlChild) {
        children.push(xmlChild)
      }
    }
    if (children.length > 0) {
      // Same Yjs type narrowness — runtime accepts widened attrs fine
      el.push(children as Array<Y.XmlElement | Y.XmlText>)
    }
  }

  return el
}
