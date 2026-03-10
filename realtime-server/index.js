/**
 * Loopwell Realtime Server
 *
 * Standalone Node.js server for Socket.io + Hocuspocus.
 * Deployed on Railway. The Next.js app on Vercel communicates via:
 *   - Clients connect directly for WebSocket events
 *   - Vercel API routes POST to /emit to broadcast after DB writes
 *
 * Environment variables:
 *   PORT            — Railway provides this (default 3000)
 *   DATABASE_URL    — Supabase/Postgres connection string (for Hocuspocus doc load/store)
 *   EMIT_SECRET     — Shared secret for /emit endpoint auth
 *   ALLOWED_ORIGINS — Comma-separated allowed CORS origins
 *   NODE_ENV        — production | development
 */

const http = require('http')
const express = require('express')
const { Server: SocketIOServer } = require('socket.io')
const { Hocuspocus } = require('@hocuspocus/server')
const WebSocket = require('ws')
const { PrismaClient } = require('@prisma/client')
const Y = require('yjs')
const { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } = require('y-prosemirror')

// ---------------------------------------------------------------------------
// TipTap schema for Hocuspocus JSON <-> Yjs conversion
// Mirrors src/lib/collab/wiki-schema-server.ts but in plain JS
// ---------------------------------------------------------------------------
const { getSchema } = require('@tiptap/core')
const { StarterKit } = require('@tiptap/starter-kit')
const { Image } = require('@tiptap/extension-image')
const { Underline } = require('@tiptap/extension-underline')
const { Link } = require('@tiptap/extension-link')
const { Placeholder } = require('@tiptap/extension-placeholder')
const { CodeBlock } = require('@tiptap/extension-code-block')
const { TaskList } = require('@tiptap/extension-task-list')
const { TaskItem } = require('@tiptap/extension-task-item')
const { Table } = require('@tiptap/extension-table')
const { TableRow } = require('@tiptap/extension-table-row')
const { TableHeader } = require('@tiptap/extension-table-header')
const { TableCell } = require('@tiptap/extension-table-cell')
const { Mention } = require('@tiptap/extension-mention')
const { Node, Extension, mergeAttributes } = require('@tiptap/core')

// Server-safe Embed node (mirrors src/lib/collab/extensions/embed-server.ts)
const EmbedServer = Node.create({
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
    return [{ tag: 'div[data-embed-id]' }, { tag: 'div[data-embed-url]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'embed-placeholder' }, HTMLAttributes), 0]
  },
})

// Server-safe Mention (mirrors src/lib/collab/extensions/mention-server.ts)
const MentionServer = Mention.configure({
  HTMLAttributes: { class: 'mention', 'data-type': 'mention' },
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

// SlashCommand — Extension only (adds global attrs to paragraph, no new nodes)
const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return { HTMLAttributes: {} }
  },
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          'data-slash-command': { default: null, rendered: false },
        },
      },
    ]
  },
})

const serverExtensions = [
  StarterKit.configure({ codeBlock: false, link: false, underline: false }),
  Underline,
  Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' } }),
  Image.configure({ inline: false, allowBase64: false }),
  Placeholder.configure({ placeholder: "Type '/' for commands..." }),
  CodeBlock,
  TaskList,
  TaskItem.configure({ nested: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  EmbedServer,
  SlashCommand,
  MentionServer,
]

let cachedSchema = null
function getWikiEditorSchema() {
  if (!cachedSchema) {
    cachedSchema = getSchema(serverExtensions)
  }
  return cachedSchema
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10)
const EMIT_SECRET = process.env.EMIT_SECRET || ''
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const FRAGMENT_NAME = 'default' // TipTap Collaboration extension reads from 'default'

if (!EMIT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[FATAL] EMIT_SECRET is required in production')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Prisma — only used by Hocuspocus for document load/store
// ---------------------------------------------------------------------------
const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express()
app.use(express.json({ limit: '1mb' }))

// Health check
app.get('/health', (_req, res) => {
  const sockets = io ? io.engine.clientsCount : 0
  const documents = hocuspocus ? hocuspocus.getDocumentsCount?.() ?? 0 : 0
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    sockets,
    documents,
    timestamp: new Date().toISOString(),
  })
})

// Emit bridge — Vercel API routes POST here after DB writes
app.post('/emit', (req, res) => {
  const { room, event, data, secret } = req.body

  if (!secret || secret !== EMIT_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' })
  }

  if (!room || !event) {
    return res.status(400).json({ error: 'Missing room or event' })
  }

  if (!io) {
    return res.status(503).json({ error: 'Socket.io not ready' })
  }

  io.to(room).emit(event, data)

  return res.json({ ok: true, room, event })
})

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app)

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 120000,
  pingInterval: 30000,
  connectTimeout: 30000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  serveClient: false,
})

// Active users and wiki editors — in-memory presence
const activeUsers = new Map()
const wikiEditors = new Map()

io.on('connection', (socket) => {
  console.log(`[Socket.io] Connected: ${socket.id}`)

  // --- Authentication ---------------------------------------------------
  socket.on('authenticate', (data) => {
    // MVP: trust the payload. TODO: verify JWT from NextAuth
    const { userId, userName, workspaceId } = data || {}
    if (!userId || !workspaceId) return

    socket.data = { userId, userName, workspaceId }
    socket.join(`workspace:${workspaceId}`)

    activeUsers.set(socket.id, {
      userId,
      userName,
      status: 'online',
      lastSeen: new Date(),
    })

    socket.broadcast.emit('userJoined', { userId, userName })
    console.log(`[Socket.io] Authenticated: ${userName} (${userId}) workspace=${workspaceId}`)
  })

  // --- Project rooms ----------------------------------------------------
  socket.on('joinProject', (projectId) => {
    socket.join(`project:${projectId}`)
    const user = activeUsers.get(socket.id)
    if (user) {
      user.currentProject = projectId
      if (socket.data) {
        socket.to(`project:${projectId}`).emit('userJoined', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          projectId,
        })
      }
    }
  })

  socket.on('leaveProject', (projectId) => {
    socket.leave(`project:${projectId}`)
    const user = activeUsers.get(socket.id)
    if (user) {
      user.currentProject = undefined
      if (socket.data) {
        socket.to(`project:${projectId}`).emit('userLeft', {
          userId: socket.data.userId,
          projectId,
        })
      }
    }
  })

  // Phase 1 colon-style room events (same semantics, different event names)
  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`)
    const user = activeUsers.get(socket.id)
    if (user) {
      user.currentProject = projectId
      if (socket.data) {
        socket.to(`project:${projectId}`).emit('userJoined', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          projectId,
        })
      }
    }
  })

  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`)
    const user = activeUsers.get(socket.id)
    if (user) {
      user.currentProject = undefined
      if (socket.data) {
        socket.to(`project:${projectId}`).emit('userLeft', {
          userId: socket.data.userId,
          projectId,
        })
      }
    }
  })

  // --- Wiki page rooms --------------------------------------------------
  socket.on('joinWikiPage', (pageId) => {
    socket.join(`wiki:${pageId}`)
    const user = activeUsers.get(socket.id)
    if (user) user.currentWikiPage = pageId
  })

  socket.on('leaveWikiPage', (pageId) => {
    socket.leave(`wiki:${pageId}`)
    const user = activeUsers.get(socket.id)
    if (user) user.currentWikiPage = undefined

    // Clean up wiki editors
    if (socket.data) {
      const editors = wikiEditors.get(pageId)
      if (editors) {
        editors.delete(socket.data.userId)
        if (editors.size === 0) wikiEditors.delete(pageId)
      }
    }
  })

  // Phase 1 colon-style page rooms (for collaborative editing)
  socket.on('join:page', (pageId) => {
    socket.join(`page:${pageId}`)
  })

  socket.on('leave:page', (pageId) => {
    socket.leave(`page:${pageId}`)
  })

  // --- Wiki editing presence (broadcast only, no DB writes) -------------
  socket.on('startEditingWiki', (data) => {
    if (!socket.data) return
    const { pageId, cursorPosition } = data || {}
    if (!pageId) return

    if (!wikiEditors.has(pageId)) wikiEditors.set(pageId, new Set())
    wikiEditors.get(pageId).add(socket.data.userId)

    socket.to(`wiki:${pageId}`).emit('wikiPageEditing', {
      pageId,
      userId: socket.data.userId,
      userName: socket.data.userName,
      cursorPosition,
    })
  })

  socket.on('stopEditingWiki', (data) => {
    if (!socket.data) return
    const { pageId } = data || {}
    if (!pageId) return

    const editors = wikiEditors.get(pageId)
    if (editors) {
      editors.delete(socket.data.userId)
      if (editors.size === 0) wikiEditors.delete(pageId)
    }

    socket.to(`wiki:${pageId}`).emit('wikiPageStoppedEditing', {
      pageId,
      userId: socket.data.userId,
    })
  })

  // --- Broadcast-only event relays (no DB writes) -----------------------
  // These events are received from clients who want to notify other clients
  // in the same room. The actual DB write happens in the Vercel API route.

  socket.on('updateTask', (data) => {
    if (!socket.data) return
    const { taskId, updates } = data || {}
    if (!taskId) return

    // Broadcast to all project rooms this socket is in
    for (const room of socket.rooms) {
      if (room.startsWith('project:')) {
        socket.to(room).emit('taskUpdated', {
          taskId,
          updates,
          userId: socket.data.userId,
        })
      }
    }
  })

  socket.on('createTask', (data) => {
    if (!socket.data) return
    const { projectId, task } = data || {}
    if (!projectId) return

    socket.to(`project:${projectId}`).emit('taskCreated', { task, projectId })
  })

  socket.on('deleteTask', (data) => {
    if (!socket.data) return
    const { taskId, projectId } = data || {}
    if (!taskId || !projectId) return

    socket.to(`project:${projectId}`).emit('taskDeleted', { taskId, projectId })
  })

  socket.on('updateProject', (data) => {
    if (!socket.data) return
    const { projectId, updates } = data || {}
    if (!projectId) return

    socket.to(`project:${projectId}`).emit('projectUpdated', {
      projectId,
      updates,
      userId: socket.data.userId,
    })
  })

  socket.on('updateWikiPage', (data) => {
    if (!socket.data) return
    const { pageId, updates } = data || {}
    if (!pageId) return

    socket.to(`wiki:${pageId}`).emit('wikiPageUpdated', {
      pageId,
      updates,
      userId: socket.data.userId,
    })
  })

  socket.on('addComment', (data) => {
    if (!socket.data) return
    const { taskId, projectId, content } = data || {}

    // Determine target room
    const targetProjectId = projectId
    if (targetProjectId) {
      socket.to(`project:${targetProjectId}`).emit('commentAdded', {
        comment: { content, userId: socket.data.userId, userName: socket.data.userName },
        taskId,
        projectId: targetProjectId,
      })
    }
  })

  socket.on('updateComment', (data) => {
    if (!socket.data) return
    const { commentId, updates, taskId, projectId } = data || {}
    if (!commentId) return

    if (projectId) {
      socket.to(`project:${projectId}`).emit('commentUpdated', { commentId, updates })
    }
  })

  socket.on('deleteComment', (data) => {
    if (!socket.data) return
    const { commentId, taskId, projectId } = data || {}
    if (!commentId) return

    if (projectId) {
      socket.to(`project:${projectId}`).emit('commentDeleted', { commentId, taskId, projectId })
    }
  })

  // --- Presence ---------------------------------------------------------
  socket.on('updatePresence', (data) => {
    if (!socket.data) return
    const { status, projectId } = data || {}

    const user = activeUsers.get(socket.id)
    if (user) {
      user.status = status
      user.lastSeen = new Date()
    }

    const room = projectId ? `project:${projectId}` : `workspace:${socket.data.workspaceId}`
    socket.to(room).emit('userPresence', {
      userId: socket.data.userId,
      status,
      projectId,
    })
  })

  // --- Disconnect -------------------------------------------------------
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id)
    if (user) {
      socket.broadcast.emit('userLeft', {
        userId: user.userId,
        projectId: user.currentProject,
      })
      activeUsers.delete(socket.id)

      // Clean up wiki editors
      for (const [pageId, editors] of wikiEditors.entries()) {
        editors.delete(user.userId)
        if (editors.size === 0) wikiEditors.delete(pageId)
      }
    }
    console.log(`[Socket.io] Disconnected: ${socket.id}`)
  })
})

// ---------------------------------------------------------------------------
// Hocuspocus — collaborative wiki editing via Yjs
// Mounted on the same HTTP server at path /collab
// ---------------------------------------------------------------------------

/** Strip nodes/marks the schema doesn't recognise (prevents conversion crash). */
function filterContentJson(json, schema) {
  const filtered = { ...json }

  if (filtered.marks) {
    filtered.marks = filtered.marks.filter((m) => m.type in schema.marks)
    if (filtered.marks.length === 0) delete filtered.marks
  }

  if (filtered.content) {
    filtered.content = filtered.content
      .filter((node) => node.type && node.type in schema.nodes)
      .map((node) => filterContentJson(node, schema))
  }

  return filtered
}

const hocuspocus = new Hocuspocus({
  name: 'loopwell-collab',

  async onAuthenticate(data) {
    // MVP: accept token as userId. TODO: verify JWT
    return {
      user: {
        id: data.token ?? 'anonymous',
        name: 'User',
      },
    }
  },

  async onLoadDocument(data) {
    const documentName = data.documentName ?? ''
    console.log('[Hocuspocus] onLoadDocument:', documentName)

    if (!documentName.startsWith('wiki-')) return data.document
    const pageId = documentName.replace('wiki-', '')
    if (!pageId) return data.document

    try {
      const page = await prisma.wikiPage.findUnique({
        where: { id: pageId },
        select: { contentJson: true, contentFormat: true, id: true },
      })

      console.log('[Hocuspocus] DB result:', {
        found: !!page,
        format: page?.contentFormat,
        hasContentJson: !!page?.contentJson,
      })

      const contentJson = page?.contentJson
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
        const safeJson = filterContentJson(contentJson, schema)

        try {
          const ydocInit = prosemirrorJSONToYDoc(schema, safeJson, FRAGMENT_NAME)
          const update = Y.encodeStateAsUpdate(ydocInit)
          Y.applyUpdate(data.document, update)
          console.log('[Hocuspocus] Loaded into Yjs doc, update size:', update.length)
        } catch (conversionErr) {
          console.error('[Hocuspocus] JSON -> Yjs conversion FAILED:', conversionErr)
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
      const page = await prisma.wikiPage.findUnique({
        where: { id: pageId },
        select: { contentFormat: true },
      })
      if (page?.contentFormat !== 'JSON') {
        console.log('[Hocuspocus] Page is not JSON format, skipping store')
        return
      }

      const json = yDocToProsemirrorJSON(data.document, FRAGMENT_NAME)
      const contentString = JSON.stringify(json)

      await prisma.wikiPage.update({
        where: { id: pageId },
        data: {
          contentJson: json,
          content: contentString,
          updatedAt: new Date(),
        },
      })

      console.log('[Hocuspocus] Stored to DB:', {
        pageId,
        contentNodes: json?.content?.length ?? 0,
      })
    } catch (err) {
      console.error('[Hocuspocus] onStoreDocument FAILED:', err)
    }
  },
})

// WebSocket server for Hocuspocus on /collab path
const collabWss = new WebSocket.Server({ noServer: true })

collabWss.on('connection', (ws, request) => {
  hocuspocus.handleConnection(ws, request)
})

// Route WebSocket upgrades: /collab → Hocuspocus, everything else → Socket.io
httpServer.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/collab')) {
    collabWss.handleUpgrade(request, socket, head, (ws) => {
      collabWss.emit('connection', ws, request)
    })
  }
  // Socket.io intercepts its own upgrade requests automatically via engine.io
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`[Realtime] Server listening on port ${PORT}`)
  console.log(`[Realtime] Socket.io ready (CORS: ${ALLOWED_ORIGINS.join(', ')})`)
  console.log(`[Realtime] Hocuspocus ready at /collab`)
  console.log(`[Realtime] Health check at /health`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Realtime] SIGTERM received, shutting down...')
  io.close()
  if (hocuspocus) await hocuspocus.destroy()
  await prisma.$disconnect()
  httpServer.close(() => {
    console.log('[Realtime] Shut down complete')
    process.exit(0)
  })
})
