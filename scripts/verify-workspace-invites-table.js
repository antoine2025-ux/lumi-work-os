#!/usr/bin/env node
/**
 * Verify workspace_invites table exists in the database
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyTable() {
  try {
    // Check if table exists
    const result = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'workspace_invites'
    `
    
    if (result.length > 0) {
      console.log('✅ Table workspace_invites exists')
      
      // Check table structure
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspace_invites'
        ORDER BY ordinal_position
      `
      
      console.log('\nTable columns:')
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`)
      })
      
      process.exit(0)
    } else {
      console.error('❌ Table workspace_invites does NOT exist')
      console.log('\nTo create it, run:')
      console.log('  npx prisma db execute --file prisma/migrations/20250116140000_add_workspace_invites/migration.sql')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error checking table:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyTable()
