#!/usr/bin/env tsx
/**
 * Print Database Connection Info
 * 
 * Shows which database Prisma CLI operations will connect to.
 * Uses the same env loading as Next.js (loads .env.local, .env, etc.)
 * 
 * Usage:
 *   npm run print-db
 *   or
 *   tsx scripts/print-db.ts
 */

import { PrismaClient } from '@prisma/client'

async function main() {
  console.log('📊 Prisma CLI Database Connection Info\n')
  
  // Show environment variables (masked)
  const databaseUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  
  console.log('Environment Variables:')
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl)
      console.log(`  DATABASE_URL: postgresql://${url.username}:***@${url.hostname}:${url.port || '5432'}/${url.pathname?.replace('/', '')}`)
      console.log(`    Host: ${url.hostname}`)
      console.log(`    Port: ${url.port || '5432'}`)
      console.log(`    Database: ${url.pathname?.replace('/', '')}`)
      console.log(`    Username: ${url.username}`)
    } catch (e) {
      console.log(`  DATABASE_URL: ${databaseUrl ? 'set (invalid format)' : 'NOT SET'}`)
    }
  } else {
    console.log('  DATABASE_URL: NOT SET')
  }
  
  if (directUrl) {
    try {
      const url = new URL(directUrl)
      console.log(`  DIRECT_URL: postgresql://${url.username}:***@${url.hostname}:${url.port || '5432'}/${url.pathname?.replace('/', '')}`)
    } catch (e) {
      console.log(`  DIRECT_URL: ${directUrl ? 'set (invalid format)' : 'NOT SET'}`)
    }
  } else {
    console.log('  DIRECT_URL: NOT SET')
  }
  
  console.log('\nActual Connection:')
  
  try {
    const prisma = new PrismaClient()
    
    // Query actual database info
    const dbInfo = await prisma.$queryRaw<Array<{
      current_database: string
      inet_server_addr: string | null
      current_schema: string
      version: string
    }>>`
      SELECT 
        current_database(),
        inet_server_addr(),
        current_schema(),
        version()
    `
    
    const info = dbInfo[0]
    console.log(`  Database name: ${info.current_database}`)
    console.log(`  Server address: ${info.inet_server_addr || 'localhost'}`)
    console.log(`  Schema: ${info.current_schema}`)
    console.log(`  PostgreSQL version: ${info.version.split(',')[0]}`)
    
    // Safe count helper: checks if Prisma model exists before calling count()
    // Prevents crashes when Prisma client is stale or model doesn't exist
    const safeCount = async (modelName: string): Promise<{ ok: boolean; value?: number; reason?: string }> => {
      const p = prisma as any
      const model = p[modelName]
      
      if (!model) {
        return { 
          ok: false, 
          reason: `prisma.${modelName} is missing. Run: npx prisma generate` 
        }
      }
      
      if (typeof model.count !== 'function') {
        return { 
          ok: false, 
          reason: `prisma.${modelName}.count is not a function` 
        }
      }
      
      try {
        const count = await model.count()
        return { ok: true, value: count }
      } catch (error: any) {
        return { 
          ok: false, 
          reason: error.message 
        }
      }
    }
    
    // Get table counts
    console.log('\nData Verification:')
    const [projects, wikiPages, spaces] = await Promise.all([
      safeCount('project'),
      safeCount('wikiPage'),
      safeCount('space')
    ])
    
    console.log(`  Projects: ${projects.ok ? projects.value : `error (${projects.reason})`}`)
    console.log(`  WikiPages: ${wikiPages.ok ? wikiPages.value : `error (${wikiPages.reason})`}`)
    console.log(`  Spaces: ${spaces.ok ? spaces.value : `error (${spaces.reason})`}`)
    
    // Check for wrong database patterns
    const dbName = info.current_database.toLowerCase()
    const wrongDbPatterns = ['_shadow', '_test', 'test_', 'dev_', '_dev']
    const isWrongDb = wrongDbPatterns.some(pattern => dbName.includes(pattern))
    
    if (isWrongDb) {
      console.log('\n⚠️  WARNING: Database name suggests this might be a test/shadow database!')
      console.log(`   Database: ${info.current_database}`)
    }
    
    await prisma.$disconnect()
  } catch (error: any) {
    console.error('\n❌ Error connecting to database:')
    console.error(`   ${error.message}`)
    if (error.code === 'P1001') {
      console.error('\n   Could not reach database server.')
      console.error('   Check your DATABASE_URL and ensure PostgreSQL is running.')
    } else if (error.code === 'P1000') {
      console.error('\n   Authentication failed.')
      console.error('   Check your DATABASE_URL credentials.')
    }
    process.exit(1)
  }
}

main().catch(console.error)
