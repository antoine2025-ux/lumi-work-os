import { Server as SocketIOServer } from 'socket.io'

// Socket.IO event types for project management
export interface ProjectManagementEvents {
  // Epic events
  epicCreated: (data: { epic: any; projectId: string; userId: string }) => void
  epicUpdated: (data: { epic: any; projectId: string; userId: string }) => void
  epicDeleted: (data: { epicId: string; projectId: string; userId: string }) => void
  
  // Milestone events
  milestoneCreated: (data: { milestone: any; projectId: string; userId: string }) => void
  milestoneUpdated: (data: { milestone: any; projectId: string; userId: string }) => void
  milestoneDeleted: (data: { milestoneId: string; projectId: string; userId: string }) => void
  
  // Task assignment events
  taskEpicAssigned: (data: { taskId: string; epicId: string | null; projectId: string; userId: string }) => void
  taskMilestoneAssigned: (data: { taskId: string; milestoneId: string | null; projectId: string; userId: string }) => void
  taskPointsUpdated: (data: { taskId: string; points: number | null; projectId: string; userId: string }) => void

  // Task comment events
  taskCommentAdded: (data: { taskId: string; comment: any; userId: string }) => void
}

// Global Socket.IO server instance
let globalSocketServer: SocketIOServer | null = null

/**
 * Set the global Socket.IO server instance
 * This should be called from the server setup
 */
export function setSocketServer(io: SocketIOServer): void {
  globalSocketServer = io
}

/**
 * Emit project management events to the project room
 * This function should be called from API routes after successful operations
 */
export function emitProjectEvent(
  projectId: string,
  event: keyof ProjectManagementEvents,
  data: any
): void {
  try {
    if (globalSocketServer) {
      globalSocketServer.to(`project:${projectId}`).emit(event, data)
      console.log(`Emitted ${event} to project:${projectId}`, data)
    } else {
      console.warn(`Socket server not available, could not emit ${event}`)
    }
  } catch (error) {
    console.error(`Error emitting ${event}:`, error)
  }
}

/**
 * Helper to get the Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return globalSocketServer
}
