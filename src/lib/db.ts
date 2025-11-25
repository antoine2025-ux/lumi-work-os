import { PrismaClient } from '@prisma/client'
import { scopingMiddleware } from './prisma/scopingMiddleware'
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

// Create Prisma client instance
const prismaClient = new PrismaClient({
  log: ['error'], // Only log errors in development for better performance
  errorFormat: 'pretty',
  // Connection pooling configuration
  datasources: {
    db: {
      url: finalDatabaseUrl,
    },
  },
})

// Get or create singleton instance
// Force recreation if BlogPost model is missing (for hot reload compatibility)
let prisma = globalForPrisma.prisma ?? prismaClient
if (globalForPrisma.prisma && typeof (globalForPrisma.prisma as any).blogPost === 'undefined') {
  // Prisma Client is stale - recreate it
  console.log('🔄 Detected stale Prisma Client, recreating...')
  globalForPrisma.prisma = undefined
  prisma = prismaClient
}

// Re-enable scoping middleware for automatic workspace isolation
// This provides defense-in-depth by automatically adding workspaceId to all queries
// Prisma v6 uses $extends instead of deprecated $use
if (!globalForPrisma.prisma) {
  // Only register middleware once (on first creation)
  try {
    // Try $use first (legacy Prisma v4 pattern - may not work in v6)
    if (typeof (prismaClient as any).$use === 'function') {
      (prismaClient as any).$use(scopingMiddleware)
      console.log('✅ Scoping middleware enabled via $use - workspace isolation enforced automatically')
    } 
    // Use $extends (Prisma v5+ pattern) - creates extended client with automatic scoping
    else if (typeof (prismaClient as any).$extends === 'function') {
      // Create scoped client using $extends
      prisma = createScopedPrisma(prismaClient) as any
      console.log('✅ Scoping middleware enabled via $extends - workspace isolation enforced automatically')
    } else {
      console.warn('⚠️ Prisma middleware methods not available')
      console.warn('⚠️ Workspace isolation relies on manual filtering - ensure all queries use workspaceId!')
    }
  } catch (error) {
    console.error('❌ Failed to enable scoping middleware:', error)
    console.error('❌ Workspace isolation relies on manual filtering - review all queries!')
    // Don't throw - allow app to start, but log the error
    // In production, you may want to fail fast here
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 PRODUCTION: Scoping middleware failed - this is a security risk!')
    }
  }
  
  // Store in global for Next.js hot reload
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
}

export { prisma }

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
