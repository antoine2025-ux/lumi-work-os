#!/usr/bin/env node
/**
 * Create workspace_invites table in lumi_work_os_dev database
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const devDbUrl = 'postgresql://tonyem@localhost:5432/lumi_work_os_dev?schema=public'
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: devDbUrl
    }
  }
})

async function createTable() {
  try {
    console.log('🔍 Checking if table exists in lumi_work_os_dev...')
    
    const exists = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'workspace_invites'
    `
    
    if (exists.length > 0) {
      console.log('✅ Table workspace_invites already exists in lumi_work_os_dev')
      process.exit(0)
    }
    
    console.log('📝 Creating workspace_invites table...')
    
    // Execute migration SQL statements one by one
    const statements = [
      `CREATE TABLE IF NOT EXISTS "workspace_invites" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
        "token" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "acceptedAt" TIMESTAMP(3),
        "revokedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdByUserId" TEXT NOT NULL,
        CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invites_token_key" ON "workspace_invites"("token")`,
      `CREATE INDEX IF NOT EXISTS "idx_invites_workspace_email" ON "workspace_invites"("workspaceId", "email")`,
      `CREATE INDEX IF NOT EXISTS "idx_invites_workspace_status" ON "workspace_invites"("workspaceId", "revokedAt", "acceptedAt")`,
      `CREATE INDEX IF NOT EXISTS "idx_invites_token" ON "workspace_invites"("token")`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'workspace_invites_workspaceId_fkey'
        ) THEN
          ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspaceId_fkey" 
          FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'workspace_invites_createdByUserId_fkey'
        ) THEN
          ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_createdByUserId_fkey" 
          FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`
    ]
    
    console.log(`📊 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await prisma.$executeRawUnsafe(statements[i])
        console.log(`  ✅ Statement ${i + 1}/${statements.length} executed`)
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`  ⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`)
        } else {
          console.error(`  ❌ Statement ${i + 1}/${statements.length} failed:`, error.message)
          throw error
        }
      }
    }
    
    console.log('\n✅ Table workspace_invites created successfully in lumi_work_os_dev!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createTable()
