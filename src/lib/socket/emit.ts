/**
 * Server-side emit helpers for API routes.
 * POSTs to the Railway realtime server /emit endpoint.
 *
 * In development (no REALTIME_SERVER_URL set), falls back to the in-process
 * getSocketServer() so local dev with server.js still works.
 */

import { getSocketServer } from '@/lib/pm/events'

const REALTIME_SERVER_URL = process.env.REALTIME_SERVER_URL
const EMIT_SECRET = process.env.EMIT_SECRET

async function postEmit(room: string, event: string, data: unknown): Promise<void> {
  if (!REALTIME_SERVER_URL || !EMIT_SECRET) {
    // Fallback: in-process emit (local dev with server.js)
    const io = getSocketServer()
    if (io) {
      io.to(room).emit(event, data)
    }
    return
  }

  try {
    await fetch(`${REALTIME_SERVER_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, event, data, secret: EMIT_SECRET }),
    })
  } catch (err) {
    console.error('[emit] Failed to POST to realtime server:', err)
  }
}

export function emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
  void postEmit(`workspace:${workspaceId}`, event, data)
}

export function emitToPage(pageId: string, event: string, data: unknown): void {
  void postEmit(`page:${pageId}`, event, data)
}

export function emitToProject(projectId: string, event: string, data: unknown): void {
  void postEmit(`project:${projectId}`, event, data)
}
