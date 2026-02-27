/**
 * Server-side emit helpers for API routes.
 * Emit events to workspace, page, or project rooms.
 *
 * Requires server.js to call setSocketServer(io) when using the custom server.
 */

import { getSocketServer } from '@/lib/pm/events'

export function emitToWorkspace(
  workspaceId: string,
  event: string,
  data: unknown
): void {
  const io = getSocketServer()
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data)
  }
}

export function emitToPage(pageId: string, event: string, data: unknown): void {
  const io = getSocketServer()
  if (io) {
    io.to(`page:${pageId}`).emit(event, data)
  }
}

export function emitToProject(
  projectId: string,
  event: string,
  data: unknown
): void {
  const io = getSocketServer()
  if (io) {
    io.to(`project:${projectId}`).emit(event, data)
  }
}
