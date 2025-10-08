import { io, Socket } from 'socket.io-client'

export interface ServerToClientEvents {
  // Task events
  taskUpdated: (data: { taskId: string; updates: any; userId: string }) => void
  taskCreated: (data: { task: any; projectId: string }) => void
  taskDeleted: (data: { taskId: string; projectId: string }) => void
  
  // Project events
  projectUpdated: (data: { projectId: string; updates: any; userId: string }) => void
  
  // Presence events
  userJoined: (data: { userId: string; userName: string; projectId?: string }) => void
  userLeft: (data: { userId: string; projectId?: string }) => void
  userPresence: (data: { userId: string; status: 'online' | 'away' | 'offline'; projectId?: string }) => void
  
  // Wiki events
  wikiPageUpdated: (data: { pageId: string; updates: any; userId: string }) => void
  wikiPageEditing: (data: { pageId: string; userId: string; userName: string; cursorPosition?: number }) => void
  wikiPageStoppedEditing: (data: { pageId: string; userId: string }) => void
  
  // Notification events
  notification: (data: { type: string; message: string; data?: any }) => void
  
  // Comment events
  commentAdded: (data: { comment: any; taskId?: string; projectId?: string }) => void
  commentUpdated: (data: { commentId: string; updates: any }) => void
  commentDeleted: (data: { commentId: string; taskId?: string; projectId?: string }) => void
}

export interface ClientToServerEvents {
  // Authentication
  authenticate: (data: { userId: string; userName: string; workspaceId: string }) => void
  
  // Join/leave rooms
  joinProject: (projectId: string) => void
  leaveProject: (projectId: string) => void
  joinWikiPage: (pageId: string) => void
  leaveWikiPage: (pageId: string) => void
  
  // Task events
  updateTask: (data: { taskId: string; updates: any }) => void
  createTask: (data: { projectId: string; task: any }) => void
  deleteTask: (data: { taskId: string; projectId: string }) => void
  
  // Project events
  updateProject: (data: { projectId: string; updates: any }) => void
  
  // Wiki events
  updateWikiPage: (data: { pageId: string; updates: any }) => void
  startEditingWiki: (data: { pageId: string; cursorPosition?: number }) => void
  stopEditingWiki: (data: { pageId: string }) => void
  
  // Comment events
  addComment: (data: { taskId?: string; projectId?: string; content: string }) => void
  updateComment: (data: { commentId: string; updates: any }) => void
  deleteComment: (data: { commentId: string; taskId?: string; projectId?: string }) => void
  
  // Presence
  updatePresence: (data: { status: 'online' | 'away' | 'offline'; projectId?: string }) => void
}

export type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: SocketType | null = null

export function getSocket(): SocketType | null {
  return socket
}

export function createSocket(): SocketType {
  if (socket?.connected) {
    return socket
  }

  const serverUrl = process.env.NODE_ENV === 'production' 
    ? process.env.NEXTAUTH_URL || 'https://lumi-work-os.vercel.app'
    : 'http://localhost:3000'

  socket = io(serverUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling']
  })

  return socket
}

export function connectSocket(userId: string, userName: string, workspaceId: string): Promise<SocketType> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      socket = createSocket()
    }

    if (socket.connected) {
      resolve(socket)
      return
    }

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id)
      socket?.emit('authenticate', { userId, userName, workspaceId })
      resolve(socket!)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      reject(error)
    })

    socket.connect()
  })
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Helper functions for common operations
export const socketActions = {
  // Project actions
  joinProject: (projectId: string) => {
    socket?.emit('joinProject', projectId)
  },
  
  leaveProject: (projectId: string) => {
    socket?.emit('leaveProject', projectId)
  },
  
  // Wiki actions
  joinWikiPage: (pageId: string) => {
    socket?.emit('joinWikiPage', pageId)
  },
  
  leaveWikiPage: (pageId: string) => {
    socket?.emit('leaveWikiPage', pageId)
  },
  
  // Task actions
  updateTask: (taskId: string, updates: any) => {
    socket?.emit('updateTask', { taskId, updates })
  },
  
  createTask: (projectId: string, task: any) => {
    socket?.emit('createTask', { projectId, task })
  },
  
  deleteTask: (taskId: string, projectId: string) => {
    socket?.emit('deleteTask', { taskId, projectId })
  },
  
  // Wiki editing actions
  startEditingWiki: (pageId: string, cursorPosition?: number) => {
    socket?.emit('startEditingWiki', { pageId, cursorPosition })
  },
  
  stopEditingWiki: (pageId: string) => {
    socket?.emit('stopEditingWiki', { pageId })
  },
  
  updateWikiPage: (pageId: string, updates: any) => {
    socket?.emit('updateWikiPage', { pageId, updates })
  },
  
  // Comment actions
  addComment: (taskId: string, content: string) => {
    socket?.emit('addComment', { taskId, content })
  },
  
  addProjectComment: (projectId: string, content: string) => {
    socket?.emit('addComment', { projectId, content })
  },
  
  // Presence actions
  updatePresence: (status: 'online' | 'away' | 'offline', projectId?: string) => {
    socket?.emit('updatePresence', { status, projectId })
  }
}
