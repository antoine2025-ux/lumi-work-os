import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import { prismaUnscoped } from '@/lib/db'
import { getWikiEditorSchema } from './wiki-schema-server'
import type { JSONContent } from '@tiptap/core'
import type { Schema } from '@tiptap/pm/model'
import { decode } from 'next-auth/jwt'

const FRAGMENT_NAME = 'default' // TipTap Collaboration extension reads from 'default'

/**
 * Recursively strip nodes and marks that the schema doesn't recognise.
 * prosemirrorJSONToYDoc throws on unknown types; this keeps the rest of
 * the document intact instead of losing everything.
 */
function filterContentJson(json: JSONContent, schema: Schema): JSONContent {
  const filtered: JSONContent = { ...json }

  if (filtered.marks) {
    const before = filtered.marks.length
    filtered.marks = filtered.marks.filter(mark => mark.type in schema.marks)
    if (filtered.marks.length < before) {
      console.warn(
        '[Hocuspocus] Stripped unknown marks:',
        json.marks?.filter(m => !(m.type in schema.marks)).map(m => m.type),
      )
    }
    if (filtered.marks.length === 0) delete filtered.marks
  }

  if (filtered.content) {
    const unknownNodes = filtered.content.filter(n => n.type && !(n.type in schema.nodes))
    if (unknownNodes.length > 0) {
      console.warn(
        '[Hocuspocus] Stripped unknown nodes:',
        unknownNodes.map(n => n.type),
      )
    }
    filtered.content = filtered.content
      .filter(node => node.type && node.type in schema.nodes)
      .map(node => filterContentJson(node, schema))
  }

  return filtered
}

/** Collect every node type used in a JSONContent tree. */
function collectNodeTypes(json: JSONContent, out: Set<string> = new Set()): Set<string> {
  if (json.type) out.add(json.type)
  if (json.content) json.content.forEach(child => collectNodeTypes(child, out))
  return out
}

/**
 * Creates and returns a Hocuspocus collaboration server instance.
 * Used for real-time wiki page editing via Yjs.
 *
 * - onLoadDocument: Loads content from DB when first client connects
 * - onStoreDocument: Saves content to DB when clients disconnect / debounce fires
 */
export function createCollabServer(): InstanceType<typeof Server> {
  const server = new Server({
    name: 'loopwell-collab',
    port: 1234,

    async onAuthenticate(data) {
      const token = data.token

      if (!token) {
        throw new Error('No authentication token provided')
      }

      // Service token bypass for server-to-server connections (Loopbrain document writer)
      const serviceSecret = process.env.COLLAB_SERVICE_SECRET
      if (serviceSecret && token === serviceSecret) {
        console.log('[Hocuspocus] Service token authenticated')
        return {
          user: {
            id: 'loopbrain-service',
            name: 'Loopbrain',
            workspaceId: 'service',
          },
        }
      }

      // Verify the JWT using NextAuth's secret
      const secret = process.env.NEXTAUTH_SECRET
      if (!secret) {
        console.error('[Hocuspocus] NEXTAUTH_SECRET not configured')
        throw new Error('Server configuration error')
      }

      try {
        const decoded = await decode({
          token,
          secret,
        })

        if (!decoded || !decoded.sub) {
          throw new Error('Invalid authentication token')
        }

        // Extract user info from JWT
        const userId = decoded.sub
        const workspaceId = decoded.workspaceId as string | undefined
        const userName = decoded.name as string | undefined

        if (!workspaceId) {
          throw new Error('No workspace context in token')
        }

        // Extract page ID from document name (e.g., "wiki-cmmjn6ybu000u8oku1k6v0eqx")
        const documentName = data.documentName
        if (!documentName || !documentName.startsWith('wiki-')) {
          throw new Error('Invalid document name')
        }

        const pageId = documentName.replace('wiki-', '')

        // Verify the user has access to this page's workspace
        const page = await prismaUnscoped.wikiPage.findFirst({
          where: {
            id: pageId,
            workspaceId: workspaceId,
          },
          select: { id: true, workspaceId: true },
        })

        if (!page) {
          throw new Error('Document not found or access denied')
        }

        console.log('[Hocuspocus] User authenticated:', {
          userId,
          workspaceId,
          pageId,
        })

        // Return user context for presence indicators
        return {
          user: {
            id: userId,
            name: userName || 'Unknown',
            workspaceId: workspaceId,
          },
        }
      } catch (error) {
        console.error('[Hocuspocus] Authentication failed:', error)
        throw new Error('Authentication failed')
      }
    },

    async onLoadDocument(data) {
      const documentName = data.documentName ?? ''
      console.log('[Hocuspocus] onLoadDocument:', documentName)

      if (!documentName.startsWith('wiki-')) return
      const pageId = documentName.replace('wiki-', '')
      if (!pageId) return

      try {
        const page = await prismaUnscoped.wikiPage.findUnique({
          where: { id: pageId },
          select: { contentJson: true, contentFormat: true, id: true },
        })

        console.log('[Hocuspocus] DB result:', {
          found: !!page,
          format: page?.contentFormat,
          hasContentJson: !!page?.contentJson,
        })

        const contentJson = page?.contentJson as JSONContent | null | undefined
        if (!contentJson) {
          console.log('[Hocuspocus] No contentJson, returning empty doc')
          return data.document
        }

        if (
          page?.contentFormat === 'JSON' &&
          contentJson.content &&
          Array.isArray(contentJson.content) &&
          contentJson.content.length > 0
        ) {
          const schema = getWikiEditorSchema()

          const contentNodeTypes = collectNodeTypes(contentJson)
          const schemaNodeTypes = new Set(Object.keys(schema.nodes))
          const missing = [...contentNodeTypes].filter(t => !schemaNodeTypes.has(t))
          console.log('[Hocuspocus] Schema nodes:', [...schemaNodeTypes].sort().join(', '))
          console.log('[Hocuspocus] Content nodes:', [...contentNodeTypes].sort().join(', '))
          if (missing.length > 0) {
            console.warn('[Hocuspocus] Nodes in content but NOT in schema:', missing)
          }

          const safeJson = filterContentJson(contentJson, schema)

          try {
            const ydocInit = prosemirrorJSONToYDoc(schema, safeJson, FRAGMENT_NAME)
            const update = Y.encodeStateAsUpdate(ydocInit)
            Y.applyUpdate(data.document, update)
            console.log('[Hocuspocus] Loaded into Yjs doc, update size:', update.length)
          } catch (conversionErr) {
            console.error('[Hocuspocus] JSON → Yjs conversion FAILED:', conversionErr)
            console.error('[Hocuspocus] contentJson sample:', JSON.stringify(safeJson).slice(0, 300))
          }
        }

        return data.document
      } catch (dbErr) {
        console.error('[Hocuspocus] DB load FAILED:', dbErr)
        return data.document
      }
    },

    async onStoreDocument(data) {
      const documentName = data.documentName ?? ''
      console.log('[Hocuspocus] onStoreDocument:', documentName)

      if (!documentName.startsWith('wiki-')) return
      const pageId = documentName.replace('wiki-', '')
      if (!pageId) return

      try {
        const page = await prismaUnscoped.wikiPage.findUnique({
          where: { id: pageId },
          select: { contentFormat: true },
        })
        if (page?.contentFormat !== 'JSON') {
          console.log('[Hocuspocus] Page is not JSON format, skipping store')
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

        console.log('[Hocuspocus] Stored to DB:', {
          pageId,
          contentNodes: (json as { content?: unknown[] })?.content?.length ?? 0,
        })
      } catch (err: unknown) {
        console.error('[Hocuspocus] onStoreDocument FAILED:', err)
      }
    },
  })

  return server
}
