const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server: SocketIOServer } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Create Socket.io server
  const io = new SocketIOServer(httpServer, {
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

  // Store active users
  const activeUsers = new Map()

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`)
    
    // Handle user authentication
    socket.on('authenticate', (data) => {
      socket.data = data
      activeUsers.set(socket.id, {
        userId: data.userId,
        userName: data.userName,
        status: 'online',
        lastSeen: new Date()
      })
      console.log(`User authenticated: ${data.userName} (${data.userId})`)
      
      // Notify others
      socket.broadcast.emit('userJoined', {
        userId: data.userId,
        userName: data.userName
      })
    })

    // Handle project room management
    socket.on('joinProject', (projectId) => {
      socket.join(`project:${projectId}`)
      console.log(`User joined project: ${projectId}`)
      
      if (socket.data) {
        socket.to(`project:${projectId}`).emit('userJoined', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          projectId
        })
      }
    })

    socket.on('leaveProject', (projectId) => {
      socket.leave(`project:${projectId}`)
      console.log(`User left project: ${projectId}`)
      
      if (socket.data) {
        socket.to(`project:${projectId}`).emit('userLeft', {
          userId: socket.data.userId,
          projectId
        })
      }
    })

    // Handle task updates
    socket.on('updateTask', (data) => {
      console.log(`Task updated: ${data.taskId}`)
      socket.broadcast.emit('taskUpdated', {
        taskId: data.taskId,
        updates: data.updates,
        userId: socket.data?.userId || 'unknown'
      })
    })

    socket.on('createTask', (data) => {
      console.log(`Task created in project: ${data.projectId}`)
      socket.broadcast.emit('taskCreated', {
        task: data.task,
        projectId: data.projectId
      })
    })

    socket.on('deleteTask', (data) => {
      console.log(`Task deleted: ${data.taskId}`)
      socket.broadcast.emit('taskDeleted', {
        taskId: data.taskId,
        projectId: data.projectId
      })
    })

    // Handle presence updates
    socket.on('updatePresence', (data) => {
      const user = activeUsers.get(socket.id)
      if (user) {
        user.status = data.status
        user.lastSeen = new Date()
      }
      
      socket.broadcast.emit('userPresence', {
        userId: socket.data?.userId || 'unknown',
        status: data.status,
        projectId: data.projectId
      })
    })

    // Handle notifications
    socket.on('sendNotification', (data) => {
      socket.broadcast.emit('notification', data)
    })

    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id)
      if (user) {
        socket.broadcast.emit('userLeft', {
          userId: user.userId
        })
        activeUsers.delete(socket.id)
      }
      console.log(`User disconnected: ${socket.id}`)
    })
  })

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running`)
  })
})
