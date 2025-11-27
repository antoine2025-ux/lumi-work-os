import { PrismaClient } from '@prisma/client'

const globalForBlogPrisma = globalThis as unknown as {
  blogPrisma: PrismaClient | undefined
}

// Check if we're using Supabase pooler (PgBouncer in transaction mode)
// PgBouncer doesn't support prepared statements, so we must disable them
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
const isUsingPooler = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pgbouncer=true')
const shouldDisablePreparedStatements = isUsingPooler || process.env.PRISMA_DISABLE_PREPARED_STATEMENTS === 'true'

// Ensure DATABASE_URL has required pooler params if using pooler
// PgBouncer requires: pgbouncer=true, sslmode=require
// AND prepared_statements=false to avoid the 42P05 error
let finalDatabaseUrl = databaseUrl
if (isUsingPooler) {
  const separator = databaseUrl.includes('?') ? '&' : '?'
  const params = []
  
  // Add required pooler params
  if (!databaseUrl.includes('pgbouncer=true')) params.push('pgbouncer=true')
  if (!databaseUrl.includes('sslmode=')) params.push('sslmode=require')
  
  // CRITICAL: Disable prepared statements for PgBouncer transaction mode
  if (!databaseUrl.includes('prepared_statements=')) params.push('prepared_statements=false')
  
  if (params.length > 0) {
    finalDatabaseUrl = `${databaseUrl}${separator}${params.join('&')}`
  }
}

// Function to create a properly configured Prisma Client for blog posts
function createBlogPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: finalDatabaseUrl,
      },
    },
  })
}

// Create singleton instance for blog Prisma client
const blogPrisma =
  globalForBlogPrisma.blogPrisma ??
  createBlogPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForBlogPrisma.blogPrisma = blogPrisma
}

// Verify BlogPost model is available
if (typeof blogPrisma.blogPost === 'undefined') {
  console.error("[BLOG DB] ❌ CRITICAL: BlogPost model not found in Prisma Client!")
  console.error("[BLOG DB] Please run: npx prisma generate")
}

console.log("[BLOG DB] ✅ Blog Prisma Client configured for Supabase")

export { blogPrisma }

