/**
 * Socket.io event type definitions for Phase 1 real-time collaborative editing.
 * Canonical source of truth for workspace activity events.
 *
 * Note: Existing realtime uses different names (taskUpdated, joinProject, wiki:${id}).
 * These Phase 1 events coexist; migration can happen later.
 */

// Server → Client events
export type ServerEvents = {
  // Wiki collaboration
  'page:presence': { pageId: string; users: { userId: string; name: string }[] }
  'page:updated': { pageId: string; updatedBy: string }

  // Task updates
  'task:assigned': { taskId: string; projectId: string; assigneeId: string }
  'task:updated': { taskId: string; projectId: string; field: string }
  'task:commented': { taskId: string; projectId: string; commentId: string }

  // Project updates
  'project:updated': { projectId: string; field: string }

  // Notifications (real-time push instead of polling)
  'notification:new': { id: string; type: string; title: string }

  // Workspace activity
  'activity:new': {
    type: string
    entityType: string
    entityId: string
    actorName: string
  }
}

// Client → Server events (callbacks)
export type ClientEvents = {
  'join:page': (pageId: string) => void
  'leave:page': (pageId: string) => void
  'join:project': (projectId: string) => void
  'leave:project': (projectId: string) => void
  'page:cursor': (payload: { pageId: string; position: { x: number; y: number } }) => void
}
