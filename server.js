const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const cron = require('node-cron')

// Initialize event listeners for org context updates
// This ensures listeners are registered before any API routes handle requests
try {
  require('./src/lib/events/init')
} catch (error) {
  // In dev mode, TypeScript files may not be compiled yet - this is OK
  // The listeners will be initialized when Next.js compiles the routes
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Events] Skipping init.ts require in dev mode (TypeScript not compiled)')
  } else {
    console.error('[Events] Failed to require init:', error)
  }
}

// Initialize Org context nightly rebuild job
// This runs once per night to rebuild Org context for all workspaces
try {
  const { registerOrgContextNightlyJob, isOrgContextNightlyJobEnabled } = require('./src/jobs/orgContextNightlyJob')
  if (isOrgContextNightlyJobEnabled()) {
    console.log('[OrgContext] Nightly job enabled – registering...')
    registerOrgContextNightlyJob()
  } else {
    console.log('[OrgContext] Nightly job disabled (ORG_CONTEXT_NIGHTLY_ENABLED !== \'true\')')
  }
} catch (error) {
  console.error('[OrgContext] Failed to register nightly job:', error)
  // Don't crash the server if job registration fails
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Global Socket.IO server instance
let io = null

// Daily summary cron job function
async function generateDailySummaries() {
  try {
    console.log('Starting daily summary generation...')
    
    // Import unscoped Prisma client for background job
    // Background jobs need unscoped access to process data across workspaces
    const { prismaUnscoped } = require('./src/lib/db')
    const prisma = prismaUnscoped
    
    // Get all projects with daily summary enabled
    const projects = await prisma.project.findMany({
      where: {
        dailySummaryEnabled: true,
        isArchived: false
      },
      select: {
        id: true,
        name: true
      }
    })
    
    console.log(`Found ${projects.length} projects with daily summaries enabled`)
    
    // Generate summaries for each project
    for (const project of projects) {
      try {
        const today = new Date().toISOString().split('T')[0]
        
        // Check if summary already exists for today
        const existingSummary = await prisma.projectDailySummary.findUnique({
          where: {
            projectId_date: {
              projectId: project.id,
              date: new Date(today)
            }
          }
        })
        
        if (existingSummary) {
          console.log(`Summary already exists for project ${project.name} on ${today}`)
          continue
        }
        
        // Import the daily summary service
        const { generateDailySummary, saveDailySummary } = require('./src/lib/ai/daily-summary.ts')
        
        // Generate the summary
        const summary = await generateDailySummary(project.id, today)
        
        // Save the summary
        await saveDailySummary(project.id, today, summary)
        
        console.log(`Generated daily summary for project: ${project.name}`)
        
        // Emit Socket.IO event to project room
        if (io) {
          io.to(`project:${project.id}`).emit('projectSummaryCreated', {
            projectId: project.id,
            date: today,
            summary: summary,
            timestamp: new Date().toISOString()
          })
          
          // Send notification to project members
          io.to(`project:${project.id}`).emit('notification', {
            type: 'daily_summary',
            message: `Daily summary generated for ${project.name}`,
            data: {
              projectId: project.id,
              projectName: project.name,
              date: today
            }
          })
        }
        
      } catch (error) {
        console.error(`Error generating summary for project ${project.name}:`, error)
      }
    }
    
    await prisma.$disconnect()
    console.log('Daily summary generation completed')
    
  } catch (error) {
    console.error('Error in daily summary cron job:', error)
  }
}

// Schedule daily summary generation at 8:00 AM local time
cron.schedule('0 8 * * *', generateDailySummaries, {
  scheduled: true,
  timezone: "America/New_York" // Adjust timezone as needed
})

console.log('Daily summary cron job scheduled for 8:00 AM local time')

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

  // Create Socket.io server (createSocketServer wires setSocketServer for API route emits)
  const { createSocketServer } = require('./src/lib/realtime/socket-server')
  const { setSocketServer } = require('./src/lib/pm/events')

  io = createSocketServer(httpServer)
  setSocketServer(io)

  // Start Hocuspocus collaboration server (port 1234)
  try {
    const { createCollabServer } = require('./src/lib/collab/hocuspocus-server')
    const collabServer = createCollabServer()
    collabServer.listen().then(() => {
      console.log('> Hocuspocus collab server running on port 1234')
    }).catch((err) => {
      console.error('[Hocuspocus] Failed to start:', err)
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Hocuspocus] Skipping (run npm run dev:collab for collab with next dev)')
    } else {
      console.error('[Hocuspocus] Failed to load:', err)
    }
  }

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running`)
  })
})