import { PrismaClient } from '@prisma/client'
// import { scopingMiddleware } from './prisma/scopingMiddleware'

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

// TODO: Re-enable scoping middleware once Prisma $use issue is resolved
// Add scoping middleware with error handling
// try {
//   if (typeof prismaClient.$use === 'function') {
//     prismaClient.$use(scopingMiddleware)
//   } else {
//     console.warn('Prisma middleware not available - scoping middleware skipped')
//   }
// } catch (error) {
//   console.warn('Failed to add scoping middleware:', error)
// }

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
