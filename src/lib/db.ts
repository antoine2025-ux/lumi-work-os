import { PrismaClient } from '@prisma/client'
import { createScopedPrisma } from './prisma/scoped-prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're using Supabase pooler (PgBouncer in transaction mode)
// PgBouncer doesn't support prepared statements, so we must disable them
const databaseUrl = process.env.DATABASE_URL || ''
const isUsingPooler = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pgbouncer=true')
const shouldDisablePreparedStatements = isUsingPooler || process.env.PRISMA_DISABLE_PREPARED_STATEMENTS === 'true'

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

// Get or create singleton instance
// FORCE clear cached client in development to ensure fresh Prisma client after schema changes
// This is critical after Prisma schema changes - Next.js caches the module
if (process.env.NODE_ENV === 'development') {
  // Always clear in dev to force fresh client after schema changes
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect().catch(() => {})
    } catch (e) {
      // Ignore
    }
  }
  // Clear the cached instance - FORCE fresh client
  globalForPrisma.prisma = undefined
  // Also clear from module cache if possible
  if (typeof require !== 'undefined' && require.cache) {
    // Clear Prisma client from require cache
    Object.keys(require.cache).forEach(key => {
      if (key.includes('@prisma/client') || key.includes('prisma')) {
        delete require.cache[key]
      }
    })
  }
}

// Feature flag for workspace scoping (defense-in-depth layer)
// When enabled, all workspace-scoped queries automatically require workspace context
// This is a safety layer - routes must still use assertAccess() + explicit where: { workspaceId }
const WORKSPACE_SCOPING_ENABLED = process.env.PRISMA_WORKSPACE_SCOPING_ENABLED === 'true'

// Base Prisma client (always unscoped) - for scripts/background jobs
// Scripts should import this directly: import { prismaUnscoped } from '@/lib/db'
const prismaUnscoped: PrismaClient = globalForPrisma.prisma || createPrismaClient()

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
  prisma = createScopedPrisma(prismaUnscoped) as any
  console.log('✅ Workspace scoping ENABLED - Prisma client is scoped, workspace context required')
  console.log('   Use setWorkspaceContext(workspaceId) before querying workspace-scoped models')
  console.log('   For scripts/background jobs, use prismaUnscoped instead')
} else {
  // Unscoped Prisma client - workspace scoping disabled
  // Current behavior: routes must manually filter by workspaceId
  prisma = prismaUnscoped
  console.log('✅ Workspace scoping DISABLED - Using unscoped Prisma client (current behavior)')
  console.log('   Enable with PRISMA_WORKSPACE_SCOPING_ENABLED=true')
}

// Verify ProjectDocumentation model is available (for documentation attachments feature)
if (typeof (prisma as any).projectDocumentation === 'undefined') {
  console.error('[PRISMA] ❌ CRITICAL: ProjectDocumentation model not found in Prisma Client!')
  console.error('[PRISMA] Please run: npx prisma generate')
  console.error('[PRISMA] Then restart your Next.js dev server')
} else {
  console.log('[PRISMA] ✅ ProjectDocumentation model available')
}

// Verify WorkspaceInvite model is available
if (typeof (prismaUnscoped as any).workspaceInvite === 'undefined') {
  console.error('[PRISMA] ❌ CRITICAL: WorkspaceInvite model not found in Prisma Client!')
  console.error('[PRISMA] Please run: npx prisma generate')
  console.error('[PRISMA] Then restart your Next.js dev server')
} else {
  console.log('[PRISMA] ✅ WorkspaceInvite model available')
  
  // Verify table exists in database (async check, don't block startup)
  if (process.env.NODE_ENV === 'development') {
    prismaUnscoped.$queryRaw`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invites' LIMIT 1`
      .then((result: any) => {
        if (result && result.length > 0) {
          console.log('[PRISMA] ✅ workspace_invites table exists in database')
        } else {
          console.error('[PRISMA] ❌ CRITICAL: workspace_invites table does NOT exist in database!')
          console.error('[PRISMA] Run: npx prisma migrate deploy')
          console.error('[PRISMA] Or: npx prisma db execute --file prisma/migrations/20250116140000_add_workspace_invites/migration.sql')
        }
      })
      .catch((error: any) => {
        console.error('[PRISMA] ⚠️  Could not verify workspace_invites table:', error.message)
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
