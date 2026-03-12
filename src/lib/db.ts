import '@/lib/env' // validate environment variables on first DB access
import { PrismaClient } from '@prisma/client'
import { createScopedPrisma } from './prisma/scoped-prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're using Supabase pooler (PgBouncer in transaction mode)
// PgBouncer doesn't support prepared statements, so we must disable them
const databaseUrl = process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_URL || ''

// Phase A: Log database connection info at startup (DEV ONLY)
if (process.env.NODE_ENV === 'development') {
  try {
    const url = new URL(databaseUrl || 'missing')
    const dbName = url.pathname?.replace('/', '') || 'unknown'
    const dbHost = url.hostname || 'unknown'
    const dbPort = url.port || '5432'
    console.log('[DB INIT] 📊 Runtime Database Connection:')
    console.log(`[DB INIT]   Host: ${dbHost}:${dbPort}`)
    console.log(`[DB INIT]   Database: ${dbName}`)
    console.log(`[DB INIT]   DATABASE_URL: postgresql://${url.username}:***@${dbHost}:${dbPort}/${dbName}`)
    if (directUrl) {
      const directUrlParsed = new URL(directUrl)
      console.log(`[DB INIT]   DIRECT_URL: postgresql://${directUrlParsed.username}:***@${directUrlParsed.hostname}:${directUrlParsed.port}/${directUrlParsed.pathname?.replace('/', '')}`)
    } else {
      console.log(`[DB INIT]   DIRECT_URL: not set`)
    }
  } catch (e: unknown) {
    console.error('[DB INIT] ⚠️  Could not parse DATABASE_URL:', e)
    console.error('[DB INIT]   DATABASE_URL value:', databaseUrl ? 'set (but invalid)' : 'NOT SET')
  }
}

const isUsingPooler = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pgbouncer=true')

// Ensure DATABASE_URL has required pooler params if using pooler
// PgBouncer requires: pgbouncer=true, connection_limit=1, sslmode=require
// AND prepared_statements=false to avoid the 42P05 error
let finalDatabaseUrl = databaseUrl
if (isUsingPooler) {
  const separator = databaseUrl.includes('?') ? '&' : '?'
  const params = []
  
  // Add required pooler params
  if (!databaseUrl.includes('pgbouncer=true')) params.push('pgbouncer=true')
  // Note: connection_limit removed - Supabase pooler handles this automatically
  // Setting connection_limit=1 was causing severe performance bottlenecks
  // by forcing all queries to run sequentially instead of in parallel
  if (!databaseUrl.includes('sslmode=')) params.push('sslmode=require')
  
  // CRITICAL: Disable prepared statements for PgBouncer transaction mode
  if (!databaseUrl.includes('prepared_statements=')) params.push('prepared_statements=false')
  
  if (params.length > 0) {
    finalDatabaseUrl = `${databaseUrl}${separator}${params.join('&')}`
  }
}

// Function to create a fresh Prisma Client instance
function createPrismaClient() {
  return new PrismaClient({
    log: ['error'], // Only log errors in development for better performance
    errorFormat: 'pretty',
    // Connection pooling configuration
    datasources: {
      db: {
        url: finalDatabaseUrl,
      },
    },
  })
}

// Get or create singleton instance (standard Prisma + Next.js pattern)
// Note: Do NOT clear/recreate on every dev load - that causes "Engine is not yet connected"
// when requests hit before the new client's engine is ready (Turbopack/chunk loading).
// After prisma generate, restart the dev server to pick up schema changes.

// Feature flag for workspace scoping (defense-in-depth layer)
// When enabled, all workspace-scoped queries automatically require workspace context
// This is a safety layer - routes must still use assertAccess() + explicit where: { workspaceId }
// Default: ON (opt-out with PRISMA_WORKSPACE_SCOPING_ENABLED=false)
const WORKSPACE_SCOPING_ENABLED = process.env.PRISMA_WORKSPACE_SCOPING_ENABLED !== 'false'

// Base Prisma client (always unscoped) - for scripts/background jobs
// Scripts should import this directly: import { prismaUnscoped } from '@/lib/db'
const prismaUnscoped: PrismaClient = globalForPrisma.prisma || createPrismaClient()

// Phase A: Verify database connection and log actual DB name (DEV ONLY)
// Phase C: Guardrail - detect wrong database and missing DATABASE_URL
if (process.env.NODE_ENV === 'development') {
  // Phase C: Check DATABASE_URL is set
  if (!databaseUrl) {
    console.error('[DB INIT] ❌ CRITICAL: DATABASE_URL is not set!')
    console.error('[DB INIT]   Create .env.local with DATABASE_URL="postgresql://..."')
    console.error('[DB INIT]   See README.md for setup instructions')
    // Don't throw in dev to allow graceful degradation, but log clearly
  }
  
  // SECURITY: Static query, no user input - $queryRaw safe.
  prismaUnscoped.$queryRaw<Array<{ current_database: string; inet_server_addr: string | null; current_schema: string }>>`
    SELECT current_database(), inet_server_addr(), current_schema()
  `.then((result) => {
    if (result && result.length > 0) {
      const dbInfo = result[0]
      console.log('[DB INIT] ✅ Connected to database:')
      console.log(`[DB INIT]   Database name: ${dbInfo.current_database}`)
      console.log(`[DB INIT]   Server address: ${dbInfo.inet_server_addr || 'localhost'}`)
      console.log(`[DB INIT]   Schema: ${dbInfo.current_schema}`)
      
      // Phase C: Guardrail - detect wrong database
      const dbName = dbInfo.current_database.toLowerCase()
      const wrongDbPatterns = ['_shadow', '_test', 'test_', 'dev_', '_dev']
      const isWrongDb = wrongDbPatterns.some(pattern => dbName.includes(pattern))
      
      if (isWrongDb) {
        console.error('[DB INIT] ❌ CRITICAL: Connected to wrong database!')
        console.error(`[DB INIT]   Database name "${dbInfo.current_database}" matches wrong DB pattern`)
        console.error('[DB INIT]   Check your DATABASE_URL in .env.local')
        console.error('[DB INIT]   Run: npm run print-db to verify Prisma CLI connection')
      }
      
      // Phase C: Verify DIRECT_URL points to same DB if set
      if (directUrl && databaseUrl) {
        try {
          const dbUrlParsed = new URL(databaseUrl)
          const directUrlParsed = new URL(directUrl)
          const dbMatches = dbUrlParsed.pathname === directUrlParsed.pathname && 
                           dbUrlParsed.hostname === directUrlParsed.hostname
          if (!dbMatches) {
            console.warn('[DB INIT] ⚠️  WARNING: DIRECT_URL points to different database than DATABASE_URL')
            console.warn(`[DB INIT]   DATABASE_URL DB: ${dbUrlParsed.pathname}`)
            console.warn(`[DB INIT]   DIRECT_URL DB: ${directUrlParsed.pathname}`)
            console.warn('[DB INIT]   They should point to the same database (only pooling settings differ)')
          }
        } catch (_e) {
          // Ignore parse errors, already logged above
        }
      }
    }
  }).catch((error) => {
    console.error('[DB INIT] ⚠️  Could not verify database connection:', error.message)
    if (error.code === 'P1001') {
      console.error('[DB INIT]   Could not reach database server. Check DATABASE_URL and ensure PostgreSQL is running.')
    }
  })
}

// Store in global for Next.js hot reload (if we just created it)
if (!globalForPrisma.prisma && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaUnscoped
}

// Main Prisma client export - scoped or unscoped based on feature flag
let prisma: PrismaClient

if (WORKSPACE_SCOPING_ENABLED) {
  // Scoped Prisma client - workspace scoping enabled
  // All workspace-scoped queries automatically require workspace context via setWorkspaceContext()
  // Missing workspace context will throw errors (both dev and prod) to prevent data leaks
  prisma = createScopedPrisma(prismaUnscoped) as unknown as PrismaClient
  console.log('✅ Workspace scoping ENABLED - Prisma client is scoped, workspace context required')
  console.log('   Use setWorkspaceContext(workspaceId) before querying workspace-scoped models')
  console.log('   For scripts/background jobs, use prismaUnscoped instead')
} else {
  // Unscoped Prisma client - workspace scoping disabled (opt-out)
  prisma = prismaUnscoped
  console.log('✅ Workspace scoping DISABLED - Using unscoped Prisma client')
  console.log('   To enable: unset PRISMA_WORKSPACE_SCOPING_ENABLED or set it to true')
}

// Verify ProjectDocumentation model is available (for documentation attachments feature)
if (typeof (prisma as unknown as Record<string, unknown>).projectDocumentation === 'undefined') {
  console.error('[PRISMA] ❌ CRITICAL: ProjectDocumentation model not found in Prisma Client!')
  console.error('[PRISMA] Please run: npx prisma generate')
  console.error('[PRISMA] Then restart your Next.js dev server')
} else {
  console.log('[PRISMA] ✅ ProjectDocumentation model available')
}

// Verify OrgInvitation model is available
if (typeof (prismaUnscoped as unknown as Record<string, unknown>).orgInvitation === 'undefined') {
  console.error('[PRISMA] ❌ CRITICAL: OrgInvitation model not found in Prisma Client!')
  console.error('[PRISMA] Please run: npx prisma generate')
  console.error('[PRISMA] Then restart your Next.js dev server')
} else {
  console.log('[PRISMA] ✅ OrgInvitation model available')
  
  // Verify table exists in database (async check, don't block startup)
  if (process.env.NODE_ENV === 'development') {
    // SECURITY: Static query, no user input - $queryRaw safe.
    prismaUnscoped.$queryRaw`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_invitations' LIMIT 1`
      .then((result: unknown) => {
        if (result && Array.isArray(result) && result.length > 0) {
          console.log('[PRISMA] ✅ org_invitations table exists in database')
        } else {
          console.error('[PRISMA] ❌ CRITICAL: org_invitations table does NOT exist in database!')
          console.error('[PRISMA] Run: npx prisma migrate deploy')
        }
      })
      .catch((error: Error) => {
        console.error('[PRISMA] ⚠️  Could not verify org_invitations table:', error.message)
      })
  }
}

export { prisma, prismaUnscoped }

/**
 * Workspace-scoped models (defense-in-depth):
 * 
 * When PRISMA_WORKSPACE_SCOPING_ENABLED=true, queries for these models automatically
 * require workspace context via setWorkspaceContext(workspaceId).
 * 
 * Models: Project, Task, Epic, Milestone, WikiPage, WikiChunk, WikiEmbed, 
 * WikiAttachment, WikiComment, WikiVersion, WikiPagePermission, WikiFavorite,
 * ChatSession, ChatMessage, FeatureFlag, Integration, Migration, Workflow,
 * WorkflowInstance, OnboardingTemplate, OnboardingPlan, OnboardingTask,
 * OrgPosition, ProjectTemplate, TaskTemplate, TaskTemplateItem, Activity,
 * CustomFieldDef, CustomFieldVal, TaskHistory, ProjectDailySummary,
 * ProjectMember, ProjectWatcher, ProjectAssignee, Subtask, TaskComment,
 * ContextItem, ContextEmbedding, ContextSummary
 * 
 * Note: This is defense-in-depth, not a replacement for assertAccess().
 * Routes must still:
 * 1. Call getUnifiedAuth() to get workspaceId
 * 2. Call assertAccess() to validate membership
 * 3. Call setWorkspaceContext(workspaceId) before queries
 * 4. Use explicit where: { workspaceId } in queries
 * 
 * For scripts/background jobs that need unscoped access:
 * import { prismaUnscoped } from '@/lib/db'
 */

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
