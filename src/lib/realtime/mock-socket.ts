// Mock Socket.io implementation for development
// This simulates real-time features without requiring a WebSocket server

export interface MockSocket {
  connected: boolean
  id: string
  data?: Record<string, unknown>
  emit: (event: string, data?: unknown) => void
  on<T = unknown>(event: string, callback: (data: T) => void): void
  off<T = unknown>(event: string, callback?: (data: T) => void): void
  disconnect: () => void
}

class MockSocketImpl implements MockSocket {
  connected = false
  id = `mock-${Math.random().toString(36).substr(2, 9)}`
  data?: Record<string, unknown>
  private listeners: Map<string, Array<(data?: unknown) => void>> = new Map()

  constructor() {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.connected = true
      this.emit('connect')
    }, 100)
  }

  emit(event: string, data?: unknown) {
    // Simulate server responses for certain events
    if (event === 'authenticate' && data) {
      this.data = data as Record<string, unknown>
      setTimeout(() => {
        this.triggerListeners('userJoined', {
          userId: (data as Record<string, unknown>).userId as string,
          userName: (data as Record<string, unknown>).userName as string
        })
      }, 200)
    }
    
    if (event === 'updateTask') {
      const d = data as Record<string, unknown>
      setTimeout(() => {
        this.triggerListeners('taskUpdated', {
          taskId: d.taskId,
          updates: d.updates,
          userId: this.data?.userId || 'mock-user'
        })
      }, 100)
    }

    if (event === 'createTask') {
      const d = data as Record<string, unknown>
      setTimeout(() => {
        this.triggerListeners('taskCreated', {
          task: d.task,
          projectId: d.projectId
        })
      }, 100)
    }
    
    if (event === 'sendNotification') {
      setTimeout(() => {
        this.triggerListeners('notification', data)
      }, 100)
    }
    
    // Notify listeners for the emitted event
    this.triggerListeners(event, data)
  }

  on<T = unknown>(event: string, callback: (data: T) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback as unknown as (data?: unknown) => void)
  }

  off<T = unknown>(event: string, callback?: (data: T) => void) {
    if (!this.listeners.has(event)) return

    if (callback) {
      const listeners = this.listeners.get(event)!
      const index = listeners.indexOf(callback as unknown as (data?: unknown) => void)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    } else {
      this.listeners.delete(event)
    }
  }

  private triggerListeners(event: string, data?: unknown) {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  disconnect() {
    this.connected = false
    this.listeners.clear()
  }
}

let mockSocket: MockSocket | null = null

export function createMockSocket(): MockSocket {
  if (mockSocket?.connected) {
    return mockSocket
  }
  
  mockSocket = new MockSocketImpl()
  return mockSocket
}

export function getMockSocket(): MockSocket | null {
  return mockSocket
}

export function connectMockSocket(userId: string, userName: string, workspaceId: string): Promise<MockSocket> {
  return new Promise((resolve) => {
    const socket = createMockSocket()
    
    socket.on('connect', () => {
      socket.emit('authenticate', { userId, userName, workspaceId })
      resolve(socket)
    })
  })
}

export function disconnectMockSocket(): void {
  if (mockSocket) {
    mockSocket.disconnect()
    mockSocket = null
  }
}
