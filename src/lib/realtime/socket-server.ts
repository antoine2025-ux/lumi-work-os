import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { startEntityGraphListener } from '@/lib/loopbrain/event-listener'
import { emitEvent } from '@/lib/events/emit'
import { ACTIVITY_EVENTS } from '@/lib/events/activityEvents'
import { calculateCompletionDays } from '@/lib/org/listeners/utils'
import { setSocketServer } from '@/lib/pm/events'

const prisma = new PrismaClient()

export interface ServerToClientEvents {
  // Task events
  taskUpdated: (data: { taskId: string; updates: Record<string, unknown>; userId: string }) => void
  taskCreated: (data: { task: Record<string, unknown>; projectId: string }) => void
  taskDeleted: (data: { taskId: string; projectId: string }) => void

  // Project events
  projectUpdated: (data: { projectId: string; updates: Record<string, unknown>; userId: string }) => void

  // Epic events
  epicCreated: (data: { epic: Record<string, unknown>; projectId: string; userId: string }) => void
  epicUpdated: (data: { epic: Record<string, unknown>; projectId: string; userId: string }) => void
  epicDeleted: (data: { epicId: string; projectId: string; userId: string }) => void

  // Milestone events
  milestoneCreated: (data: { milestone: Record<string, unknown>; projectId: string; userId: string }) => void
  milestoneUpdated: (data: { milestone: Record<string, unknown>; projectId: string; userId: string }) => void
  milestoneDeleted: (data: { milestoneId: string; projectId: string; userId: string }) => void

  // Task assignment events
  taskEpicAssigned: (data: { taskId: string; epicId: string | null; projectId: string; userId: string }) => void
  taskMilestoneAssigned: (data: { taskId: string; milestoneId: string | null; projectId: string; userId: string }) => void
  taskPointsUpdated: (data: { taskId: string; points: number | null; projectId: string; userId: string }) => void

  // Task comment events
  taskCommentAdded: (data: { taskId: string; comment: Record<string, unknown>; userId: string }) => void

  // Project summary events
  projectSummaryCreated: (data: { projectId: string; date: string; summary: string; timestamp: string }) => void

  // Presence events
  userJoined: (data: { userId: string; userName: string; projectId?: string }) => void
  userLeft: (data: { userId: string; projectId?: string }) => void
  userPresence: (data: { userId: string; status: 'online' | 'away' | 'offline'; projectId?: string }) => void

  // Wiki events
  wikiPageUpdated: (data: { pageId: string; updates: Record<string, unknown>; userId: string }) => void
  wikiPageEditing: (data: { pageId: string; userId: string; userName: string; cursorPosition?: number }) => void
  wikiPageStoppedEditing: (data: { pageId: string; userId: string }) => void

  // Notification events
  notification: (data: { type: string; message: string; data?: Record<string, unknown> }) => void

  // Comment events
  commentAdded: (data: { comment: Record<string, unknown>; taskId?: string; projectId?: string }) => void
  commentUpdated: (data: { commentId: string; updates: Record<string, unknown> }) => void
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
  // Phase 1: page/project rooms for collaborative editing
  'join:page': (pageId: string) => void
  'leave:page': (pageId: string) => void
  'join:project': (projectId: string) => void
  'leave:project': (projectId: string) => void

  // Task events
  updateTask: (data: { taskId: string; updates: Record<string, unknown> }) => void
  createTask: (data: { projectId: string; task: Record<string, unknown> }) => void
  deleteTask: (data: { taskId: string; projectId: string }) => void

  // Project events
  updateProject: (data: { projectId: string; updates: Record<string, unknown> }) => void

  // Wiki events
  updateWikiPage: (data: { pageId: string; updates: Record<string, unknown> }) => void
  startEditingWiki: (data: { pageId: string; cursorPosition?: number }) => void
  stopEditingWiki: (data: { pageId: string }) => void

  // Comment events
  addComment: (data: { taskId?: string; projectId?: string; content: string }) => void
  updateComment: (data: { commentId: string; updates: Record<string, unknown> }) => void
  deleteComment: (data: { commentId: string; taskId?: string; projectId?: string }) => void

  // Presence
  updatePresence: (data: { status: 'online' | 'away' | 'offline'; projectId?: string }) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId: string
  userName: string
  workspaceId: string
}

export type SocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

// Store active users and their presence
const activeUsers = new Map<string, {
  userId: string
  userName: string
  status: 'online' | 'away' | 'offline'
  currentProject?: string
  currentWikiPage?: string
  lastSeen: Date
}>()

// Store users currently editing wiki pages
const wikiEditors = new Map<string, Set<string>>()

export function createSocketServer(httpServer: NetServer): SocketServer {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : "http://localhost:3000",
      methods: ["GET", "POST"]
    },
    pingTimeout: 120000, // Increased to 2 minutes
    pingInterval: 30000, // Increased to 30 seconds
    connectTimeout: 30000, // Increased to 30 seconds
    transports: ['websocket', 'polling'],
    allowEIO3: true, // Allow Engine.IO v3 clients
    serveClient: false // Don't serve client files
  })

  startEntityGraphListener(io)

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`)
    
    // Handle user authentication and data
    socket.on('authenticate', async (data: { userId: string; userName: string; workspaceId: string }) => {
      socket.data = data

      // Phase 1: Join workspace room for workspace-scoped events
      if (data.workspaceId) {
        socket.join(`workspace:${data.workspaceId}`)
      }
      
      // Add to active users
      activeUsers.set(socket.id, {
        userId: data.userId,
        userName: data.userName,
        status: 'online',
        lastSeen: new Date()
      })
      
      // Notify others in the workspace
      socket.broadcast.emit('userJoined', {
        userId: data.userId,
        userName: data.userName
      })
      
      console.log(`User authenticated: ${data.userName} (${data.userId})`)
    })

    // Project room management
    socket.on('joinProject', (projectId: string) => {
      socket.join(`project:${projectId}`)
      
      if (socket.data) {
        activeUsers.set(socket.id, {
          ...activeUsers.get(socket.id)!,
          currentProject: projectId
        })
        
        // Notify others in the project
        socket.to(`project:${projectId}`).emit('userJoined', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          projectId
        })
      }
    })

    socket.on('leaveProject', (projectId: string) => {
      socket.leave(`project:${projectId}`)
      
      if (socket.data) {
        activeUsers.set(socket.id, {
          ...activeUsers.get(socket.id)!,
          currentProject: undefined
        })
        
        // Notify others in the project
        socket.to(`project:${projectId}`).emit('userLeft', {
          userId: socket.data.userId,
          projectId
        })
      }
    })

    // Wiki page room management
    socket.on('joinWikiPage', (pageId: string) => {
      socket.join(`wiki:${pageId}`)
      
      if (socket.data) {
        activeUsers.set(socket.id, {
          ...activeUsers.get(socket.id)!,
          currentWikiPage: pageId
        })
      }
    })

    socket.on('leaveWikiPage', (pageId: string) => {
      socket.leave(`wiki:${pageId}`)
      
      if (socket.data) {
        activeUsers.set(socket.id, {
          ...activeUsers.get(socket.id)!,
          currentWikiPage: undefined
        })
        
        // Remove from wiki editors
        const editors = wikiEditors.get(pageId)
        if (editors) {
          editors.delete(socket.data.userId)
          if (editors.size === 0) {
            wikiEditors.delete(pageId)
          }
        }
      }
    })

    // Phase 1: page room management (page:${pageId}) — for collaborative editing
    // TODO: JWT handshake auth; path /api/socketio migration
    socket.on('join:page', (pageId: string) => {
      socket.join(`page:${pageId}`)
    })

    socket.on('leave:page', (pageId: string) => {
      socket.leave(`page:${pageId}`)
    })

    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`)
      if (socket.data) {
        activeUsers.set(socket.id, {
          ...activeUsers.get(socket.id)!,
          currentProject: projectId
        })
        socket.to(`project:${projectId}`).emit('userJoined', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          projectId
        })
      }
    })

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`)
      if (socket.data) {
        activeUsers.set(socket.id, {
          ...activeUsers.get(socket.id)!,
          currentProject: undefined
        })
        socket.to(`project:${projectId}`).emit('userLeft', {
          userId: socket.data.userId,
          projectId
        })
      }
    })

    // Task events
    socket.on('updateTask', async (data) => {
      if (!socket.data) return
      
      try {
        // Get existing task to check if status is changing to DONE
        const existingTask = await prisma.task.findUnique({
          where: { id: data.taskId },
          select: {
            status: true,
            completedAt: true,
            createdAt: true,
            projectId: true
          }
        })
        
        // Update task in database
        const updatedTask = await prisma.task.update({
          where: { id: data.taskId },
          data: data.updates,
          include: {
            assignee: true,
            project: true
          }
        })
        
        // Emit activity event if task was just completed
        if (existingTask && data.updates.status === 'DONE' && !existingTask.completedAt) {
          const completionDays = calculateCompletionDays(
            existingTask.createdAt,
            new Date()
          )
          
          emitEvent(ACTIVITY_EVENTS.TASK_COMPLETED, {
            workspaceId: socket.data.workspaceId,
            userId: socket.data.userId,
            taskId: data.taskId,
            projectId: existingTask.projectId,
            completionDays,
            timestamp: new Date()
          }).catch((err) => 
            console.error('Failed to emit task completed event', err)
          )
        }
        
        // Broadcast to project room
        socket.to(`project:${updatedTask.projectId}`).emit('taskUpdated', {
          taskId: data.taskId,
          updates: data.updates,
          userId: socket.data.userId
        })
        
        // Send notification
        socket.to(`project:${updatedTask.projectId}`).emit('notification', {
          type: 'task_updated',
          message: `${socket.data.userName} updated a task`,
          data: { taskId: data.taskId, taskTitle: updatedTask.title }
        })
      } catch (error) {
        console.error('Error updating task:', error)
      }
    })

    socket.on('createTask', async (data) => {
      if (!socket.data) return
      
      try {
        // Create task in database
        const newTask = await prisma.task.create({
          data: {
            ...data.task,
            projectId: data.projectId,
            workspaceId: socket.data.workspaceId,
            createdById: socket.data.userId
          } as unknown as Parameters<typeof prisma.task.create>[0]['data'],
          include: {
            assignee: true,
            project: true
          }
        })
        
        // Emit activity event
        emitEvent(ACTIVITY_EVENTS.TASK_CREATED, {
          workspaceId: socket.data.workspaceId,
          userId: socket.data.userId,
          taskId: newTask.id,
          projectId: data.projectId,
          assigneeId: newTask.assigneeId,
          timestamp: new Date()
        }).catch((err) => 
          console.error('Failed to emit task created event', err)
        )
        
        // Broadcast to project room
        socket.to(`project:${data.projectId}`).emit('taskCreated', {
          task: newTask,
          projectId: data.projectId
        })
        
        // Send notification
        socket.to(`project:${data.projectId}`).emit('notification', {
          type: 'task_created',
          message: `${socket.data.userName} created a new task`,
          data: { taskId: newTask.id, taskTitle: newTask.title }
        })
      } catch (error) {
        console.error('Error creating task:', error)
      }
    })

    socket.on('deleteTask', async (data) => {
      if (!socket.data) return
      
      try {
        // Delete task from database
        await prisma.task.delete({
          where: { id: data.taskId }
        })
        
        // Broadcast to project room
        socket.to(`project:${data.projectId}`).emit('taskDeleted', {
          taskId: data.taskId,
          projectId: data.projectId
        })
        
        // Send notification
        socket.to(`project:${data.projectId}`).emit('notification', {
          type: 'task_deleted',
          message: `${socket.data.userName} deleted a task`,
          data: { taskId: data.taskId }
        })
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    })

    // Wiki editing events
    socket.on('startEditingWiki', (data) => {
      if (!socket.data) return
      
      // Add to wiki editors
      if (!wikiEditors.has(data.pageId)) {
        wikiEditors.set(data.pageId, new Set())
      }
      wikiEditors.get(data.pageId)!.add(socket.data.userId)
      
      // Notify others editing the same page
      socket.to(`wiki:${data.pageId}`).emit('wikiPageEditing', {
        pageId: data.pageId,
        userId: socket.data.userId,
        userName: socket.data.userName,
        cursorPosition: data.cursorPosition
      })
    })

    socket.on('stopEditingWiki', (data) => {
      if (!socket.data) return
      
      // Remove from wiki editors
      const editors = wikiEditors.get(data.pageId)
      if (editors) {
        editors.delete(socket.data.userId)
        if (editors.size === 0) {
          wikiEditors.delete(data.pageId)
        }
      }
      
      // Notify others
      socket.to(`wiki:${data.pageId}`).emit('wikiPageStoppedEditing', {
        pageId: data.pageId,
        userId: socket.data.userId
      })
    })

    socket.on('updateWikiPage', async (data) => {
      if (!socket.data) return
      
      try {
        // Update wiki page in database
        await prisma.wikiPage.update({
          where: { id: data.pageId },
          data: data.updates
        })
        
        // Emit activity event
        emitEvent(ACTIVITY_EVENTS.WIKI_PAGE_EDITED, {
          workspaceId: socket.data.workspaceId,
          userId: socket.data.userId,
          wikiPageId: data.pageId,
          timestamp: new Date()
        }).catch((err) => 
          console.error('Failed to emit wiki page edited event', err)
        )
        
        // Broadcast to wiki page room
        socket.to(`wiki:${data.pageId}`).emit('wikiPageUpdated', {
          pageId: data.pageId,
          updates: data.updates,
          userId: socket.data.userId
        })
      } catch (error) {
        console.error('Error updating wiki page:', error)
      }
    })

    // Comment events
    socket.on('addComment', async (data) => {
      if (!socket.data) return
      
      try {
        let comment
        if (data.taskId) {
          comment = await prisma.taskComment.create({
            data: {
              taskId: data.taskId,
              userId: socket.data.userId,
              content: data.content,
              workspaceId: socket.data.workspaceId
            },
            include: {
              user: true,
              task: {
                select: {
                  projectId: true
                }
              }
            }
          })
        }
        
        if (comment) {
          // Emit activity event
          emitEvent(ACTIVITY_EVENTS.COMMENT_POSTED, {
            workspaceId: socket.data.workspaceId,
            userId: socket.data.userId,
            commentId: comment.id,
            taskId: data.taskId,
            projectId: comment.task?.projectId,
            timestamp: new Date()
          }).catch((err) => 
            console.error('Failed to emit comment posted event', err)
          )
          
          // For task comments, we need to get the project ID from the task
          let projectId = data.projectId
          if (data.taskId && comment.task) {
            projectId = comment.task.projectId
          }
          
          const room = `project:${projectId}`
          socket.to(room).emit('commentAdded', {
            comment,
            taskId: data.taskId,
            projectId
          })
        }
      } catch (error) {
        console.error('Error adding comment:', error)
      }
    })

    // Presence management
    socket.on('updatePresence', (data) => {
      if (!socket.data) return
      
      const user = activeUsers.get(socket.id)
      if (user) {
        user.status = data.status
        user.lastSeen = new Date()
        
        // Broadcast presence update
        const room = data.projectId ? `project:${data.projectId}` : 'workspace'
        socket.to(room).emit('userPresence', {
          userId: socket.data.userId,
          status: data.status,
          projectId: data.projectId
        })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id)
      if (user) {
        // Notify others
        socket.broadcast.emit('userLeft', {
          userId: user.userId,
          projectId: user.currentProject
        })
        
        // Clean up
        activeUsers.delete(socket.id)
        
        // Clean up wiki editors
        for (const [pageId, editors] of wikiEditors.entries()) {
          editors.delete(user.userId)
          if (editors.size === 0) {
            wikiEditors.delete(pageId)
          }
        }
      }
      
      console.log(`User disconnected: ${socket.id}`)
    })
  })

  // Wire shared instance so API routes can emit via getSocketServer()
  setSocketServer(io)

  return io
}

// Helper function to get active users in a project
export function getActiveUsersInProject(projectId: string): Array<{ userId: string; userName: string; status: string }> {
  return Array.from(activeUsers.values())
    .filter(user => user.currentProject === projectId)
    .map(user => ({
      userId: user.userId,
      userName: user.userName,
      status: user.status
    }))
}

// Helper function to get users editing a wiki page
export function getWikiEditors(pageId: string): Array<{ userId: string; userName: string }> {
  const editors = wikiEditors.get(pageId)
  if (!editors) return []
  
  return Array.from(editors).map(userId => {
    const user = Array.from(activeUsers.values()).find(u => u.userId === userId)
    return user ? { userId: user.userId, userName: user.userName } : { userId, userName: 'Unknown' }
  })
}
