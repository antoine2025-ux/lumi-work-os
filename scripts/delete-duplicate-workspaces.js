/**
 * Script to Delete Duplicate Workspaces
 * 
 * WARNING: This will permanently delete workspaces and ALL associated data!
 * Projects, Tasks, Wiki Pages, Chat Sessions, etc. will all be deleted.
 * 
 * Usage:
 * 1. Set the email and workspace ID in the variables below
 * 2. Run: node scripts/delete-duplicate-workspaces.js
 */

import { PrismaClient } from '@prisma/client'
import readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function listUserWorkspaces(email) {
  console.log(`\n📋 Workspaces for ${email}:\n`)
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workspaceMemberships: {
        include: {
          workspace: {
            include: {
              _count: {
                select: {
                  projects: true,
                  tasks: true,
                  wikiPages: true,
                  members: true,
                  chatSessions: true
                }
              }
            }
          }
        },
        where: { role: 'OWNER' }
      }
    }
  })

  if (!user) {
    console.log(`❌ User with email ${email} not found`)
    return null
  }

  if (user.workspaceMemberships.length === 0) {
    console.log(`⚠️  User has no workspaces`)
    return null
  }

  const workspaces = user.workspaceMemberships.map(wm => wm.workspace)
  workspaces.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  workspaces.forEach((ws, index) => {
    const counts = ws._count
    console.log(`${index + 1}. ${ws.name} (${ws.slug})`)
    console.log(`   ID: ${ws.id}`)
    console.log(`   Created: ${ws.createdAt.toISOString()}`)
    console.log(`   Stats: ${counts.projects} projects, ${counts.tasks} tasks, ${counts.wikiPages} wiki pages, ${counts.members} members`)
    console.log('')
  })

  return workspaces
}

async function deleteWorkspace(workspaceId) {
  console.log(`\n🗑️  Deleting workspace ${workspaceId}...`)
  
  try {
    // Prisma will handle cascading deletes based on schema
    const deleted = await prisma.workspace.delete({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            projects: true,
            tasks: true,
            wikiPages: true
          }
        }
      }
    })

    console.log(`✅ Deleted workspace: ${deleted.name}`)
    console.log(`   This also deleted:`)
    console.log(`   - ${deleted._count.projects} projects`)
    console.log(`   - ${deleted._count.tasks} tasks`)
    console.log(`   - ${deleted._count.wikiPages} wiki pages`)
    console.log(`   - All associated data (members, chat sessions, etc.)`)
    
    return true
  } catch (error) {
    console.error(`❌ Error deleting workspace:`, error.message)
    return false
  }
}

async function main() {
  console.log('🔍 Duplicate Workspace Deletion Tool\n')
  console.log('⚠️  WARNING: This will permanently delete workspaces and all associated data!\n')

  const email = await question('Enter email address to check for duplicate workspaces: ')
  
  if (!email) {
    console.log('❌ Email is required')
    process.exit(1)
  }

  const workspaces = await listUserWorkspaces(email)
  
  if (!workspaces || workspaces.length === 0) {
    process.exit(0)
  }

  if (workspaces.length === 1) {
    console.log('✅ User only has one workspace. No duplicates to delete.')
    process.exit(0)
  }

  console.log(`\n⚠️  Found ${workspaces.length} workspaces for this user.\n`)
  console.log('The MOST RECENT workspace is usually the one to keep.')
  console.log('The OLDER workspaces are usually duplicates to delete.\n')

  const keepMostRecent = await question('Do you want to keep the most recent workspace and delete the rest? (yes/no): ')
  
  if (keepMostRecent.toLowerCase() !== 'yes') {
    console.log('Cancelled.')
    process.exit(0)
  }

  // Keep the first one (most recent), delete the rest
  const toDelete = workspaces.slice(1)
  
  console.log(`\n🗑️  Will delete ${toDelete.length} workspace(s):`)
  toDelete.forEach(ws => {
    console.log(`   - ${ws.name} (${ws.id})`)
  })

  const confirm = await question('\n⚠️  Type "DELETE" to confirm: ')
  
  if (confirm !== 'DELETE') {
    console.log('Cancelled.')
    process.exit(0)
  }

  console.log('\n🗑️  Deleting workspaces...\n')
  
  let successCount = 0
  let failCount = 0

  for (const ws of toDelete) {
    const success = await deleteWorkspace(ws.id)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log(`\n✅ Deletion complete:`)
  console.log(`   Successfully deleted: ${successCount}`)
  console.log(`   Failed: ${failCount}`)
  
  // List remaining workspaces
  console.log('\n📋 Remaining workspaces:')
  await listUserWorkspaces(email)
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    rl.close()
  })




