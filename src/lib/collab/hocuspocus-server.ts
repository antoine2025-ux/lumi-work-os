import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import { prismaUnscoped } from '@/lib/db'
import { getWikiEditorSchema } from './wiki-schema-server'
import type { JSONContent } from '@tiptap/core'

const FRAGMENT_NAME = 'default' // TipTap Collaboration uses 'default'

// #region agent log
const DBG_LOG = (loc: string, msg: string, data: Record<string, unknown>, hyp: string) => {
  fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bc54f1' },
    body: JSON.stringify({
      sessionId: 'bc54f1',
      location: loc,
      message: msg,
      data,
      hypothesisId: hyp,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion

/**
 * Creates and returns a Hocuspocus collaboration server instance.
 * Used for real-time wiki page editing via Yjs.
 *
 * - onLoadDocument: Loads content from DB when first client connects
 * - onStoreDocument: Saves content to DB when last client disconnects
 * - Phase 4: Add proper auth in onAuthenticate
 */
export function createCollabServer(): InstanceType<typeof Server> {
  const server = new Server({
    name: 'loopwell-collab',
    port: 1234,

    async onAuthenticate(data) {
      return {
        user: {
          id: data.token ?? 'anonymous',
          name: 'User',
        },
      }
    },

    async onLoadDocument(data) {
      const documentName = data.documentName ?? ''
      // #region agent log
      DBG_LOG('hocuspocus-server.ts:onLoadDocument:entry', 'onLoadDocument called', {
        documentName,
        startsWithWiki: documentName.startsWith('wiki-'),
      }, 'H1')
      // #endregion
      console.log('[Hocuspocus] onLoadDocument called for:', documentName)

      if (!documentName.startsWith('wiki-')) return
      const pageId = documentName.replace('wiki-', '')
      console.log('[Hocuspocus] Loading page:', pageId)
      if (!pageId) return

      try {
        const page = await prismaUnscoped.wikiPage.findUnique({
          where: { id: pageId },
          select: { contentJson: true, contentFormat: true, id: true },
        })
        // #region agent log
        DBG_LOG('hocuspocus-server.ts:onLoadDocument:dbResult', 'DB query result', {
          found: !!page,
          contentFormat: page?.contentFormat,
          hasContentJson: !!page?.contentJson,
          contentJsonContentLen: (page?.contentJson as { content?: unknown[] })?.content?.length ?? null,
          passesCheck: !!(
            page?.contentFormat === 'JSON' &&
            page?.contentJson &&
            (page.contentJson as { content?: unknown[] })?.content &&
            Array.isArray((page.contentJson as { content?: unknown[] }).content) &&
            (page.contentJson as { content?: unknown[] }).content!.length > 0
          ),
        }, 'H2-H3')
        // #endregion
        console.log('[Hocuspocus] DB result:', {
          found: !!page,
          format: page?.contentFormat,
          hasContentJson: !!page?.contentJson,
          contentJsonType: typeof page?.contentJson,
          contentJsonKeys: page?.contentJson ? Object.keys(page.contentJson as Record<string, unknown>) : null,
        })

        const contentJson = page?.contentJson as JSONContent | null | undefined
        if (!page?.contentJson) {
          console.log('[Hocuspocus] No contentJson, returning empty doc')
          return data.document
        }

        console.log('[Hocuspocus] contentJson sample:', JSON.stringify(contentJson).slice(0, 200))
        console.log('[Hocuspocus] Attempting prosemirrorJSONToYDoc conversion...')

        if (
          page?.contentFormat === 'JSON' &&
          contentJson &&
          contentJson.content &&
          Array.isArray(contentJson.content) &&
          contentJson.content.length > 0
        ) {
          const schema = getWikiEditorSchema()
          try {
            // #region agent log
            DBG_LOG('hocuspocus-server.ts:onLoadDocument:preConvert', 'Attempting prosemirrorJSONToYDoc', {
              contentSample: JSON.stringify(contentJson).slice(0, 150),
              fragmentName: FRAGMENT_NAME,
            }, 'H4')
            // #endregion
            const ydocInit = prosemirrorJSONToYDoc(schema, contentJson, FRAGMENT_NAME)
            const update = Y.encodeStateAsUpdate(ydocInit)
            console.log('[Hocuspocus] Conversion succeeded. Ydoc state size:', update.length)
            // #region agent log
            DBG_LOG('hocuspocus-server.ts:onLoadDocument:postConvert', 'Conversion succeeded', {
              updateLen: update.length,
              fragmentName: FRAGMENT_NAME,
            }, 'H4')
            // #endregion
            Y.applyUpdate(data.document, update)
            console.log('[Hocuspocus] Applied update to document. Final doc size:', Y.encodeStateAsUpdate(data.document).length)
            // #region agent log
            DBG_LOG('hocuspocus-server.ts:onLoadDocument:postApply', 'Applied update to document', {
              finalDocUpdateLen: Y.encodeStateAsUpdate(data.document).length,
            }, 'H5')
            // #endregion
          } catch (conversionErr) {
            // #region agent log
            DBG_LOG('hocuspocus-server.ts:onLoadDocument:convertError', 'prosemirrorJSONToYDoc threw', {
              error: String(conversionErr),
              errorName: (conversionErr as Error)?.name,
            }, 'H4')
            // #endregion
            console.error('[Hocuspocus] JSON → Yjs conversion FAILED:', conversionErr)
            console.error('[Hocuspocus] This is likely a schema mismatch between wiki-schema.ts and the actual editor extensions')
          }
        }
        return data.document
      } catch (dbErr) {
        // #region agent log
        DBG_LOG('hocuspocus-server.ts:onLoadDocument:catch', 'onLoadDocument DB/catch failed', {
          error: String(dbErr),
          errorName: (dbErr as Error)?.name,
        }, 'H2')
        // #endregion
        console.error('[Hocuspocus] DB load FAILED:', dbErr)
        return data.document
      }
    },

    async onStoreDocument(data) {
      const documentName = data.documentName ?? ''
      // #region agent log
      DBG_LOG('hocuspocus-server.ts:onStoreDocument:entry', 'onStoreDocument called', {
        documentName,
      }, 'H1')
      // #endregion
      console.log('[Hocuspocus] onStoreDocument called for:', documentName)

      if (!documentName.startsWith('wiki-')) return
      const pageId = documentName.replace('wiki-', '')
      if (!pageId) return

      try {
        const page = await prismaUnscoped.wikiPage.findUnique({
          where: { id: pageId },
          select: { contentFormat: true },
        })
        if (page?.contentFormat !== 'JSON') {
          console.log('[Hocuspocus] onStoreDocument: page is not JSON format, skipping')
          return
        }

        const json = yDocToProsemirrorJSON(data.document, FRAGMENT_NAME)
        const contentString = JSON.stringify(json)

        await prismaUnscoped.wikiPage.update({
          where: { id: pageId },
          data: {
            contentJson: json as object,
            content: contentString,
            updatedAt: new Date(),
          },
        })
        // #region agent log
        DBG_LOG('hocuspocus-server.ts:onStoreDocument:done', 'Saved to DB', {
          pageId,
          jsonContentLen: json?.content?.length ?? 0,
        }, 'H1')
        // #endregion
        console.log('[Hocuspocus] onStoreDocument: saved to DB', {
          pageId,
          contentLen: (json as { content?: unknown[] })?.content?.length ?? 0,
          contentSample: contentString.slice(0, 100),
        })
      } catch (err) {
        // #region agent log
        DBG_LOG('hocuspocus-server.ts:onStoreDocument:catch', 'onStoreDocument failed', {
          error: String(err),
          pageId,
        }, 'H2')
        // #endregion
        console.error('[Hocuspocus] onStoreDocument FAILED:', err)
      }
    },
  })

  return server
}
