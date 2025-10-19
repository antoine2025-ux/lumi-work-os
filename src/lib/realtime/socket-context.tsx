'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { SocketType, createSocket, connectSocket, disconnectSocket, socketActions } from './socket-client'
import { MockSocket, createMockSocket, connectMockSocket, disconnectMockSocket } from './mock-socket'

interface SocketContextType {
  socket: SocketType | MockSocket | null
  isConnected: boolean
  isConnecting: boolean
  isRetrying: boolean
  error: string | null
  connect: (userId: string, userName: string, workspaceId: string) => Promise<void>
  disconnect: () => void
  checkConnectionHealth: () => Promise<boolean>
  actions: typeof socketActions
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
  userId?: string
  userName?: string
  workspaceId?: string
}

export function SocketProvider({ children, userId, userName, workspaceId }: SocketProviderProps) {
  const [socket, setSocket] = useState<SocketType | MockSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const connect = useCallback(async (userId: string, userName: string, workspaceId: string, attempt: number = 0) => {
    if (socket?.connected) return
    
    setIsConnecting(true)
    setError(null)
    
    try {
      // Check if Socket.IO is enabled via environment variable
      const socketIOEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO === 'true'
      
      if (socketIOEnabled) {
        // Try real socket first, fallback to mock
        let newSocket: SocketType | MockSocket
        try {
          console.log(`Socket connection attempt ${attempt + 1} for user ${userId}`)
          newSocket = await connectSocket(userId, userName, workspaceId)
          setRetryCount(0) // Reset retry count on successful connection
          console.log('Real socket connected successfully')
        } catch (err) {
          console.log('Real socket failed, using mock socket:', err)
          console.log('Error details:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            attempt: attempt + 1,
            userId,
            workspaceId
          })
          newSocket = await connectMockSocket(userId, userName, workspaceId)
        }
      } else {
        // Skip real socket connection - use mock socket directly
        console.log('Using mock socket (Socket.IO disabled via NEXT_PUBLIC_ENABLE_SOCKET_IO)')
        const newSocket = await connectMockSocket(userId, userName, workspaceId)
        setSocket(newSocket)
        setIsConnected(true)
        setError(null)
        setIsRetrying(false)
        setRetryCount(0)
        return
      }
      
      setSocket(newSocket)
      setIsConnected(true)
      setError(null)
      setIsRetrying(false)
      setRetryCount(0)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      console.error('Socket connection failed:', err)
    } finally {
      setIsConnecting(false)
    }
  }, [socket, retryCount])

  const checkConnectionHealth = useCallback(async (): Promise<boolean> => {
    if (!socket) return false
    
    // For real sockets, check if they're actually connected
    if ('connected' in socket && typeof socket.connected === 'boolean') {
      return socket.connected
    }
    
    // For mock sockets, assume they're always healthy
    return true
  }, [socket])

  const disconnect = useCallback(() => {
    disconnectSocket()
    disconnectMockSocket()
    setSocket(null)
    setIsConnected(false)
    setError(null)
    setRetryCount(0)
    setIsRetrying(false)
  }, [])

  // Auto-connect if user data is provided
  useEffect(() => {
    if (userId && userName && workspaceId && !socket) {
      connect(userId, userName, workspaceId)
    }
  }, [userId, userName, workspaceId, socket, connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    isRetrying,
    error,
    connect,
    disconnect,
    checkConnectionHealth,
    actions: socketActions
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

// Hook for real-time task updates
export function useTaskUpdates(projectId: string) {
  const { socket } = useSocket()
  const [tasks, setTasks] = useState<any[]>([])
  const [activeUsers, setActiveUsers] = useState<Array<{ userId: string; userName: string; status: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load existing tasks from API
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/projects/${projectId}`)
        if (response.ok) {
          const project = await response.json()
          setTasks(project.tasks || [])
        }
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      loadTasks()
    }
  }, [projectId])

  useEffect(() => {
    if (!socket || !projectId) return

    // Join project room
    socket.emit('joinProject', projectId)

    // Listen for task updates
    const handleTaskUpdated = (data: { taskId: string; updates: any; userId: string }) => {
      setTasks(prev => prev.map(task => 
        task.id === data.taskId 
          ? { ...task, ...data.updates }
          : task
      ))
    }

    const handleTaskCreated = (data: { task: any; projectId: string }) => {
      if (data.projectId === projectId) {
        setTasks(prev => [...prev, data.task])
      }
    }

    const handleTaskDeleted = (data: { taskId: string; projectId: string }) => {
      if (data.projectId === projectId) {
        setTasks(prev => prev.filter(task => task.id !== data.taskId))
      }
    }

    const handleUserJoined = (data: { userId: string; userName: string; projectId?: string }) => {
      if (data.projectId === projectId) {
        setActiveUsers(prev => {
          const exists = prev.find(user => user.userId === data.userId)
          if (exists) return prev
          return [...prev, { userId: data.userId, userName: data.userName, status: 'online' }]
        })
      }
    }

    const handleUserLeft = (data: { userId: string; projectId?: string }) => {
      if (data.projectId === projectId) {
        setActiveUsers(prev => prev.filter(user => user.userId !== data.userId))
      }
    }

    const handleUserPresence = (data: { userId: string; status: 'online' | 'away' | 'offline'; projectId?: string }) => {
      if (data.projectId === projectId) {
        setActiveUsers(prev => prev.map(user => 
          user.userId === data.userId 
            ? { ...user, status: data.status }
            : user
        ))
      }
    }

    // Add event listeners
    socket.on('taskUpdated', handleTaskUpdated)
    socket.on('taskCreated', handleTaskCreated)
    socket.on('taskDeleted', handleTaskDeleted)
    socket.on('userJoined', handleUserJoined)
    socket.on('userLeft', handleUserLeft)
    socket.on('userPresence', handleUserPresence)

    // Cleanup
    return () => {
      socket.emit('leaveProject', projectId)
      socket.off('taskUpdated', handleTaskUpdated)
      socket.off('taskCreated', handleTaskCreated)
      socket.off('taskDeleted', handleTaskDeleted)
      socket.off('userJoined', handleUserJoined)
      socket.off('userLeft', handleUserLeft)
      socket.off('userPresence', handleUserPresence)
    }
  }, [socket, projectId])

  return { tasks, activeUsers, isLoading }
}

// Hook for real-time wiki editing
export function useWikiEditing(pageId: string) {
  const { socket } = useSocket()
  const [editors, setEditors] = useState<Array<{ userId: string; userName: string; cursorPosition?: number }>>([])
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!socket || !pageId) return

    // Join wiki page room
    socket.emit('joinWikiPage', pageId)

    const handleEditing = (data: { pageId: string; userId: string; userName: string; cursorPosition?: number }) => {
      if (data.pageId === pageId) {
        setEditors(prev => {
          const exists = prev.find(editor => editor.userId === data.userId)
          if (exists) {
            return prev.map(editor => 
              editor.userId === data.userId 
                ? { ...editor, cursorPosition: data.cursorPosition }
                : editor
            )
          }
          return [...prev, { userId: data.userId, userName: data.userName, cursorPosition: data.cursorPosition }]
        })
      }
    }

    const handleStoppedEditing = (data: { pageId: string; userId: string }) => {
      if (data.pageId === pageId) {
        setEditors(prev => prev.filter(editor => editor.userId !== data.userId))
      }
    }

    socket.on('wikiPageEditing', handleEditing)
    socket.on('wikiPageStoppedEditing', handleStoppedEditing)

    return () => {
      socket.emit('leaveWikiPage', pageId)
      socket.off('wikiPageEditing', handleEditing)
      socket.off('wikiPageStoppedEditing', handleStoppedEditing)
    }
  }, [socket, pageId])

  const startEditing = useCallback((cursorPosition?: number) => {
    if (socket && pageId) {
      socket.emit('startEditingWiki', { pageId, cursorPosition })
      setIsEditing(true)
    }
  }, [socket, pageId])

  const stopEditing = useCallback(() => {
    if (socket && pageId) {
      socket.emit('stopEditingWiki', { pageId })
      setIsEditing(false)
    }
  }, [socket, pageId])

  return { editors, isEditing, startEditing, stopEditing }
}

// Hook for notifications
export function useNotifications() {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; message: string; data?: any; timestamp: Date }>>([])

  useEffect(() => {
    if (!socket) return

    const handleNotification = (data: { type: string; message: string; data?: any }) => {
      const notification = {
        id: Date.now().toString(),
        type: data.type,
        message: data.message,
        data: data.data,
        timestamp: new Date()
      }
      
      setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50 notifications
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket])

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  return { notifications, clearNotification, clearAllNotifications }
}
