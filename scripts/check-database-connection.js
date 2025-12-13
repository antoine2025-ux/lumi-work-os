#!/usr/bin/env node
/**
 * Check which database Prisma is connecting to and verify workspace_invites table
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...\n')
    
    // Check current database
    const dbResult = await prisma.$queryRaw`SELECT current_database() as db`
    const currentDb = dbResult[0]?.db
    console.log(`✅ Connected to database: ${currentDb}`)
    
    // List all databases
    console.log('\n📋 Checking all databases...')
    const allDbs = await prisma.$queryRaw`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false 
      AND datname LIKE '%lumi%'
      ORDER BY datname
    `
    console.log('Databases with "lumi" in name:')
    allDbs.forEach(db => {
      console.log(`  - ${db.datname}`)
    })
    
    // Check if workspace_invites exists in current database
    console.log(`\n🔍 Checking workspace_invites table in ${currentDb}...`)
    const tableCheck = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'workspace_invites'
    `
    
    if (tableCheck.length > 0) {
      console.log('✅ Table workspace_invites EXISTS in current database')
      
      // Check table structure
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspace_invites'
        ORDER BY ordinal_position
      `
      console.log('\n📊 Table structure:')
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`)
      })
    } else {
      console.log('❌ Table workspace_invites DOES NOT EXIST in current database')
      console.log('\n💡 Possible solutions:')
      console.log('  1. Check if you need to connect to a different database')
      console.log('  2. Run: npx prisma migrate deploy')
      console.log('  3. Or manually create the table')
    }
    
    // Try to use the model directly
    console.log('\n🧪 Testing Prisma model access...')
    try {
      const count = await prisma.workspaceInvite.count()
      console.log(`✅ Prisma model works! Found ${count} invites`)
    } catch (modelError) {
      console.log(`❌ Prisma model error: ${modelError.message}`)
      if (modelError.message.includes('does not exist')) {
        console.log('\n💡 The table might exist in a different database!')
        console.log('   Check your DATABASE_URL in .env file')
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
