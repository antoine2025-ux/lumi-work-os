/**
 * Seed E2E Test User
 * 
 * Creates/updates the e2e@loopwell.test user with a test workspace.
 * This script is idempotent - safe to run multiple times.
 * 
 * Usage: npm run seed:e2e
 * 
 * Creates:
 * - User: e2e@loopwell.test
 * - Workspace: E2E Test Workspace (slug: e2e-test-workspace)
 * - WorkspaceMember: OWNER role
 */

import { PrismaClient } from '@prisma/client'

// Configure Prisma client with proper pooler settings for Supabase
// Prefer DIRECT_URL if available (better for migrations/seeding), otherwise use DATABASE_URL
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
const isUsingPooler = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pgbouncer=true')

// Ensure DATABASE_URL has required pooler params if using pooler
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

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: finalDatabaseUrl,
    },
  },
})

const E2E_USER_EMAIL = 'e2e@loopwell.test'
const E2E_USER_NAME = 'E2E Test User'
const E2E_WORKSPACE_NAME = 'E2E Test Workspace'
const E2E_WORKSPACE_SLUG = 'e2e-test-workspace'

async function seedE2EUser() {
  console.log('🌱 Seeding E2E test user...')
  
  // Check DATABASE_URL is set before attempting connection
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || databaseUrl.trim() === '') {
    console.error('❌ CRITICAL: DATABASE_URL environment variable is not set!')
    console.error('   This script requires DATABASE_URL to be set in the environment')
    console.error('   In CI: Check GitHub repository secrets (Settings > Secrets > Actions)')
    console.error('   Locally: Check your .env or .env.local file')
    process.exit(1)
  }
  
  console.log('📊 Environment check:')
  console.log(`   DATABASE_URL: ${databaseUrl.substring(0, 30)}... (${databaseUrl.length} chars)`)
  console.log(`   Using pooler: ${isUsingPooler}`)
  if (isUsingPooler) {
    console.log(`   Final URL params: ${finalDatabaseUrl.includes('pgbouncer=true') ? 'pgbouncer=true' : ''} ${finalDatabaseUrl.includes('sslmode=') ? 'sslmode=require' : ''} ${finalDatabaseUrl.includes('prepared_statements=false') ? 'prepared_statements=false' : ''}`)
  }
  
  // Verify database connection and log which database we're using
  try {
    const dbInfo = await prisma.$queryRaw<Array<{ current_database: string; inet_server_addr: string | null }>>`
      SELECT current_database(), inet_server_addr()
    `
    
    if (dbInfo && dbInfo.length > 0) {
      const db = dbInfo[0]
      const databaseUrl = process.env.DATABASE_URL || 'NOT SET'
      const dbNameFromUrl = databaseUrl !== 'NOT SET' 
        ? new URL(databaseUrl).pathname?.replace('/', '') || 'unknown'
        : 'unknown'
      
      console.log('📊 Database Connection:')
      console.log(`   Database name: ${db.current_database}`)
      console.log(`   Server: ${db.inet_server_addr || 'localhost'}`)
      console.log(`   DATABASE_URL points to: ${dbNameFromUrl}`)
      
      // Warn if URL and actual DB don't match
      if (dbNameFromUrl !== 'unknown' && db.current_database !== dbNameFromUrl) {
        console.warn(`   ⚠️  WARNING: DATABASE_URL points to "${dbNameFromUrl}" but connected to "${db.current_database}"`)
        console.warn(`   This may indicate a database mismatch issue!`)
      }
      
      // Detect wrong database patterns
      const dbName = db.current_database.toLowerCase()
      const wrongDbPatterns = ['_shadow', '_test', 'test_', 'dev_', '_dev']
      const isWrongDb = wrongDbPatterns.some(pattern => dbName.includes(pattern))
      
      if (isWrongDb) {
        console.error(`   ❌ CRITICAL: Connected to wrong database!`)
        console.error(`   Database name "${db.current_database}" matches wrong DB pattern`)
        console.error(`   Check your DATABASE_URL environment variable`)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn('⚠️  Could not verify database connection:', errorMessage)
    
    // Provide helpful diagnostics for authentication errors
    if (errorMessage.includes('Authentication failed') || errorMessage.includes('password authentication failed')) {
      console.error('')
      console.error('❌ AUTHENTICATION ERROR:')
      console.error('   The database credentials are invalid or the database is not accessible.')
      console.error('   Please verify:')
      console.error('   1. The DATABASE_URL secret in GitHub Actions is correct')
      console.error('   2. The password matches your Supabase project')
      console.error('   3. Supabase allows connections from GitHub Actions IPs (check Network Restrictions)')
      console.error('   4. The username format is correct: postgres.{project-ref}')
      console.error('')
      console.error('   To get the correct connection string:')
      console.error('   - Go to Supabase Dashboard → Project Settings → Database')
      console.error('   - Copy the "Connection string" → "Transaction mode" (for pooler)')
      console.error('   - Or use "Direct connection" if pooler doesn\'t work')
      console.error('')
    }
  }
  
  try {
    // 1. Create or update the E2E user
    const user = await prisma.user.upsert({
      where: { email: E2E_USER_EMAIL },
      update: {
        name: E2E_USER_NAME,
        emailVerified: new Date(),
      },
      create: {
        email: E2E_USER_EMAIL,
        name: E2E_USER_NAME,
        emailVerified: new Date(),
      },
    })
    console.log(`✅ User created/updated: ${user.email} (${user.id})`)
    
    // 2. Create or find the E2E workspace
    let workspace = await prisma.workspace.findUnique({
      where: { slug: E2E_WORKSPACE_SLUG },
    })
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: E2E_WORKSPACE_NAME,
          slug: E2E_WORKSPACE_SLUG,
          ownerId: user.id,
        },
      })
      console.log(`✅ Workspace created: ${workspace.name} (${workspace.id})`)
    } else {
      console.log(`✅ Workspace exists: ${workspace.name} (${workspace.id})`)
    }
    
    // 3. Ensure user is a member with OWNER role
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
    })
    
    if (!existingMembership) {
      await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
        },
      })
      console.log(`✅ Workspace membership created: OWNER`)
    } else {
      // Update to OWNER if not already
      if (existingMembership.role !== 'OWNER') {
        await prisma.workspaceMember.update({
          where: { id: existingMembership.id },
          data: { role: 'OWNER' },
        })
        console.log(`✅ Workspace membership updated to: OWNER`)
      } else {
        console.log(`✅ Workspace membership exists: ${existingMembership.role}`)
      }
    }
    
    console.log('')
    console.log('🎉 E2E seed complete!')
    console.log(`   User: ${E2E_USER_EMAIL}`)
    console.log(`   Workspace: ${E2E_WORKSPACE_SLUG}`)
    console.log('')
    
  } catch (error) {
    console.error('❌ E2E seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedE2EUser()

