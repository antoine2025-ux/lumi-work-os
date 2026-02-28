'use client'

import { useState, useEffect, useRef } from 'react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import type { Doc as YDoc } from 'yjs'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'
import type { JSONContent } from '@tiptap/core'
import { getWikiEditorSchema } from '@/lib/collab/wiki-schema'
import { getUserColor } from '@/lib/collab/user-colors'

const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234'

/**
 * Check if Ydoc has meaningful content in the default fragment.
 * TipTap Collaboration uses field 'default'.
 */
function isYdocEmpty(ydoc: YDoc): boolean {
  const fragment = ydoc.getXmlFragment('default')
  return fragment.length === 0
}

/**
 * Hook to create and manage a Hocuspocus provider for wiki page collaboration.
 * Injects initialContent into the Ydoc when it's empty after first sync.
 */
export function useCollabProvider(
  pageId: string,
  userId: string | undefined,
  initialContent?: JSONContent | null,
  userName?: string | null
) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const injectedRef = useRef(false)

  useEffect(() => {
    if (!pageId) {
      setProvider(null)
      setIsConnected(false)
      return
    }

    const p = new HocuspocusProvider({
      url: COLLAB_URL,
      name: `wiki-${pageId}`,
      token: userId ?? 'anonymous',
    })

    if (p.awareness && (userId || userName)) {
      p.setAwarenessField('user', {
        id: userId ?? 'anonymous',
        name: userName ?? 'Anonymous',
        color: getUserColor(userId ?? 'anonymous'),
      })
    }

    const handleSynced = () => {
      setIsConnected(true)

      const ydoc = p.document
      const empty = isYdocEmpty(ydoc)

      // Fallback: inject initialContent only when Ydoc is empty after sync
      // (e.g. server load failed, or page is new). Primary path is Hocuspocus onLoadDocument.
      if (injectedRef.current) return
      if (!initialContent || !initialContent.content?.length) return

      if (!empty) return

      injectedRef.current = true
      try {
        const schema = getWikiEditorSchema()
        const ydocInit = prosemirrorJSONToYDoc(schema, initialContent, 'default')
        const update = encodeStateAsUpdate(ydocInit)
        applyUpdate(ydoc, update)
      } catch (err) {
        console.error('[Collab] Failed to inject fallback initial content:', err)
        injectedRef.current = false
      }
    }

    const handleStatus = ({ status }: { status: string }) => {
      setIsConnected(status === 'connected')
    }

    p.on('synced', handleSynced)
    p.on('status', handleStatus)

    setProvider(p)

    // Fallback: if synced never fires (e.g. collab server not running), inject after delay.
    // synced only fires when connected to server; without server the doc stays empty.
    const timeoutMs = 2500
    const timeoutId = setTimeout(() => {
      if (injectedRef.current) return
      if (!initialContent || !initialContent.content?.length) return
      const ydoc = p.document
      if (!isYdocEmpty(ydoc)) return

      injectedRef.current = true
      try {
        const schema = getWikiEditorSchema()
        const ydocInit = prosemirrorJSONToYDoc(schema, initialContent, 'default')
        const update = encodeStateAsUpdate(ydocInit)
        applyUpdate(ydoc, update)
      } catch (err) {
        console.error('[Collab] Timeout fallback injection failed:', err)
        injectedRef.current = false
      }
    }, timeoutMs)

    return () => {
      clearTimeout(timeoutId)
      p.off('synced', handleSynced)
      p.off('status', handleStatus)
      p.destroy()
      setProvider(null)
      setIsConnected(false)
      injectedRef.current = false
    }
  }, [pageId, userId, userName])

  return { provider, isConnected }
}
