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

  // Try different transport configurations
  const transportConfigs = [
    ['polling'], // Start with polling only
    ['websocket'], // Then try websocket only
    ['polling', 'websocket'] // Finally try both
  ]

  let configIndex = 0
  const createSocketWithConfig = (transports: string[]) => {
    console.log('Creating socket with transports:', transports)
    
    socket = io(serverUrl, {
      autoConnect: false,
      transports: transports as any,
      timeout: 30000, // Increased to 30 seconds
      pingTimeout: 120000, // Increased to 2 minutes
      pingInterval: 30000, // Increased to 30 seconds
      reconnection: true,
      reconnectionAttempts: 10, // Increased retry attempts
      reconnectionDelay: 2000, // Start with 2 seconds
      reconnectionDelayMax: 10000, // Max 10 seconds between retries
      maxReconnectionAttempts: 10,
      forceNew: true, // Force new connection
      upgrade: true, // Allow transport upgrades
      rememberUpgrade: false // Don't remember failed upgrades
    })

    return socket
  }

  // Start with polling only for better compatibility
  socket = createSocketWithConfig(transportConfigs[0])

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

    let connectionTimeout: NodeJS.Timeout
    let hasResolved = false

    const cleanup = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
      }
      socket?.off('connect', onConnect)
      socket?.off('connect_error', onConnectError)
      socket?.off('disconnect', onDisconnect)
    }

    const onConnect = () => {
      if (hasResolved) return
      hasResolved = true
      cleanup()
      console.log('Socket connected successfully:', socket?.id)
      console.log('Socket transport:', socket?.io.engine.transport.name)
      socket?.emit('authenticate', { userId, userName, workspaceId })
      resolve(socket!)
    }

    const onConnectError = (error: Error) => {
      if (hasResolved) return
      hasResolved = true
      cleanup()
      console.error('Socket connection error:', error)
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      })
      
      // Check if this is a server not available error
      if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
        console.log('Socket.IO server appears to be unavailable. This is normal if running with "npm run dev" instead of "npm run dev:realtime"')
      }
      
      reject(error)
    }

    const onDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason)
      if (reason === 'io server disconnect') {
        // Server disconnected the client, don't auto-reconnect
        socket?.connect()
      }
    }

    // Set up event listeners
    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    socket.on('disconnect', onDisconnect)

    // Set connection timeout - reduced to 10 seconds for faster fallback
    connectionTimeout = setTimeout(() => {
      if (hasResolved) return
      hasResolved = true
      cleanup()
      const timeoutError = new Error('Socket connection timeout after 10 seconds - Socket.IO server may not be running')
      console.error('Socket connection timeout:', timeoutError)
      console.error('Socket state:', socket?.connected, socket?.disconnected, socket?.id)
      console.log('💡 Tip: Use "npm run dev:realtime" to enable Socket.IO features, or the app will use mock sockets')
      reject(timeoutError)
    }, 10000) // Reduced to 10 seconds for faster fallback

    // Attempt connection
    console.log('Attempting socket connection to:', serverUrl)
    console.log('Socket configuration:', {
      timeout: socket.io.timeout,
      pingTimeout: socket.io.pingTimeout,
      pingInterval: socket.io.pingInterval,
      transports: socket.io.opts.transports
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
