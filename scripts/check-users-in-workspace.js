#!/usr/bin/env node
/**
 * Quick script to check if users exist in the database and workspace
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n')
    
    // Get total user count
    const totalUsers = await prisma.user.count()
    console.log(`📊 Total users in database: ${totalUsers}`)
    
    if (totalUsers === 0) {
      console.log('❌ No users found in database!')
      process.exit(1)
    }
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      take: 10
    })
    
    console.log('\n👥 Sample users:')
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.name || 'No name'}) - Active: ${user.isActive ?? true}`)
    })
    
    // Check workspace memberships
    console.log('\n🏢 Checking workspace memberships...')
    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    })
    
    if (workspaces.length === 0) {
      console.log('❌ No workspaces found!')
      process.exit(1)
    }
    
    console.log(`\n📊 Found ${workspaces.length} workspace(s):`)
    for (const workspace of workspaces) {
      console.log(`\n  Workspace: ${workspace.name} (${workspace.slug})`)
      console.log(`    ID: ${workspace.id}`)
      console.log(`    Members: ${workspace._count.members}`)
      
      // Get members
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              isActive: true
            }
          }
        }
      })
      
      if (members.length > 0) {
        console.log(`    Member details:`)
        members.forEach(member => {
          console.log(`      - ${member.user.email} (${member.user.name || 'No name'}) - Role: ${member.role} - Active: ${member.user.isActive ?? true}`)
        })
      } else {
        console.log(`    ⚠️  No members found in this workspace!`)
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

checkUsers()

