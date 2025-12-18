#!/usr/bin/env node
/**
 * Check all databases in PostgreSQL to see if there are similar names
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDatabases() {
  try {
    console.log('🔍 Checking all databases in PostgreSQL...\n')
    
    // Query to get all databases
    const databases = await prisma.$queryRaw`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `
    
    console.log(`📊 Found ${databases.length} database(s):\n`)
    databases.forEach(db => {
      const name = db.datname
      const isLumiRelated = name.toLowerCase().includes('lumi') || 
                           name.toLowerCase().includes('work') ||
                           name.toLowerCase().includes('loop')
      const marker = isLumiRelated ? '⭐' : '  '
      console.log(`${marker} ${name}`)
    })
    
    // Check current database
    const currentDb = await prisma.$queryRaw`SELECT current_database() as db`
    console.log(`\n✅ Currently connected to: ${currentDb[0].db}`)
    
    // Check .env file
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env')
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/)
      if (dbUrlMatch) {
        const dbUrl = dbUrlMatch[1]
        const dbNameMatch = dbUrl.match(/\/\/([^:]+):([^@]+)@[^\/]+\/([^?]+)/)
        if (dbNameMatch) {
          const dbNameFromEnv = dbNameMatch[3]
          console.log(`\n📝 DATABASE_URL in .env points to: ${dbNameFromEnv}`)
          
          if (dbNameFromEnv !== currentDb[0].db) {
            console.log(`\n⚠️  WARNING: .env DATABASE_URL (${dbNameFromEnv}) doesn't match current connection (${currentDb[0].db})!`)
          } else {
            console.log(`✅ Database names match!`)
          }
        }
      }
    }
    
    // Check for similar database names
    const similarDbs = databases.filter(db => {
      const name = db.datname.toLowerCase()
      return (name.includes('lumi') || name.includes('work') || name.includes('loop')) &&
             name !== currentDb[0].db.toLowerCase()
    })
    
    if (similarDbs.length > 0) {
      console.log(`\n🔍 Found ${similarDbs.length} similar database(s):`)
      similarDbs.forEach(db => {
        console.log(`   - ${db.datname}`)
      })
    } else {
      console.log(`\n✅ No other similar databases found`)
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

checkDatabases()

