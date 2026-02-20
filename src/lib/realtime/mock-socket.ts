// Mock Socket.io implementation for development
// This simulates real-time features without requiring a WebSocket server

export interface MockSocket {
  connected: boolean
  id: string
  data?: any
  emit: (event: string, data?: any) => void
  on: (event: string, callback: (data?: any) => void) => void
  off: (event: string, callback?: (data?: any) => void) => void
  disconnect: () => void
}

class MockSocketImpl implements MockSocket {
  connected = false
  id = `mock-${Math.random().toString(36).substr(2, 9)}`
  data?: any
  private listeners: Map<string, Array<(data?: any) => void>> = new Map()

  constructor() {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.connected = true
      this.emit('connect')
    }, 100)
  }

  emit(event: string, data?: any) {
    console.log(`[Mock Socket] Emitting ${event}:`, data)
    
    // Simulate server responses for certain events
    if (event === 'authenticate' && data) {
      this.data = data
      setTimeout(() => {
        this.triggerListeners('userJoined', {
          userId: data.userId,
          userName: data.userName
        })
      }, 200)
    }
    
    if (event === 'updateTask') {
      setTimeout(() => {
        this.triggerListeners('taskUpdated', {
          taskId: data.taskId,
          updates: data.updates,
          userId: this.data?.userId || 'mock-user'
        })
      }, 100)
    }
    
    if (event === 'createTask') {
      setTimeout(() => {
        this.triggerListeners('taskCreated', {
          task: data.task,
          projectId: data.projectId
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

  on(event: string, callback: (data?: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback?: (data?: any) => void) {
    if (!this.listeners.has(event)) return
    
    if (callback) {
      const listeners = this.listeners.get(event)!
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    } else {
      this.listeners.delete(event)
    }
  }

  private triggerListeners(event: string, data?: any) {
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
