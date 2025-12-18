#!/usr/bin/env node
/**
 * Check both databases to see which one has users
 */

const { PrismaClient } = require('@prisma/client')

async function checkDatabase(dbName) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://tonyem@localhost:5432/${dbName}?schema=public`
      }
    }
  })
  
  try {
    const currentDb = await prisma.$queryRaw`SELECT current_database() as db`
    const userCount = await prisma.user.count()
    const workspaceCount = await prisma.workspace.count()
    
    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { members: true }
        }
      }
    })
    
    return {
      dbName: currentDb[0].db,
      userCount,
      workspaceCount,
      workspaces: workspaces.map(w => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        members: w._count.members
      }))
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('🔍 Checking both databases...\n')
  
  const [prod, dev] = await Promise.all([
    checkDatabase('lumi_work_os'),
    checkDatabase('lumi_work_os_dev')
  ])
  
  console.log('📊 Production Database (lumi_work_os):')
  console.log(`   Users: ${prod.userCount}`)
  console.log(`   Workspaces: ${prod.workspaceCount}`)
  if (prod.workspaces.length > 0) {
    prod.workspaces.forEach(w => {
      console.log(`   - ${w.name} (${w.slug}): ${w.members} members`)
    })
  }
  
  console.log('\n📊 Development Database (lumi_work_os_dev):')
  console.log(`   Users: ${dev.userCount}`)
  console.log(`   Workspaces: ${dev.workspaceCount}`)
  if (dev.workspaces.length > 0) {
    dev.workspaces.forEach(w => {
      console.log(`   - ${w.name} (${w.slug}): ${w.members} members`)
    })
  }
  
  console.log('\n📝 Current .env DATABASE_URL: postgresql://tonyem@localhost:5432/lumi_work_os')
  console.log(`✅ Using: ${prod.dbName}`)
  
  if (prod.userCount === 0 && dev.userCount > 0) {
    console.log('\n⚠️  WARNING: Production DB is empty but Dev DB has users!')
    console.log('   You might want to switch to lumi_work_os_dev')
  } else if (prod.userCount > 0 && dev.userCount === 0) {
    console.log('\n✅ Production DB has users, Dev DB is empty')
  }
}

main().catch(console.error)

