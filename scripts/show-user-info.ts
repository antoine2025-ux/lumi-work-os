#!/usr/bin/env ts-node

/**
 * Script to show user information including userId
 * 
 * Usage:
 *   npx ts-node scripts/show-user-info.ts <email>
 * 
 * Example:
 *   npx ts-node scripts/show-user-info.ts tony@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showUserInfo(email?: string) {
  try {
    if (!email) {
      console.log('Usage: npx ts-node scripts/show-user-info.ts <email>')
      console.log('Example: npx ts-node scripts/show-user-info.ts tony@example.com')
      process.exit(1)
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      console.log(`❌ User not found with email: ${email}`)
      process.exit(1)
    }

    console.log('\n📋 User Information:')
    console.log('─'.repeat(50))
    console.log(`User ID: ${user.id}`)
    console.log(`Name: ${user.name || 'N/A'}`)
    console.log(`Email: ${user.email}`)
    console.log(`Created: ${user.createdAt}`)

    // Get workspace memberships
    const workspaceMemberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    console.log('\n🏢 Workspace Memberships:')
    console.log('─'.repeat(50))
    if (workspaceMemberships.length === 0) {
      console.log('No workspace memberships found')
    } else {
      workspaceMemberships.forEach((wm, idx) => {
        console.log(`\n${idx + 1}. Workspace: ${wm.workspace.name}`)
        console.log(`   Workspace ID: ${wm.workspaceId}`)
        console.log(`   Role: ${wm.role}`)
        console.log(`   Joined: ${wm.joinedAt}`)
      })
    }

    // Get ProjectSpace memberships
    const projectSpaceMemberships = await prisma.projectSpaceMember.findMany({
      where: { userId: user.id },
      include: {
        projectSpace: {
          select: {
            id: true,
            name: true,
            visibility: true,
            workspace: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log('\n📁 ProjectSpace Memberships:')
    console.log('─'.repeat(50))
    if (projectSpaceMemberships.length === 0) {
      console.log('No ProjectSpace memberships found')
    } else {
      projectSpaceMemberships.forEach((psm, idx) => {
        console.log(`\n${idx + 1}. ProjectSpace: ${psm.projectSpace.name}`)
        console.log(`   ProjectSpace ID: ${psm.projectSpaceId}`)
        console.log(`   Visibility: ${psm.projectSpace.visibility}`)
        console.log(`   Workspace: ${psm.projectSpace.workspace.name} (${psm.projectSpace.workspace.id})`)
        console.log(`   Joined: ${psm.joinedAt}`)
      })
    }

    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  const email = process.argv[2]
  showUserInfo(email)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed:', error)
      process.exit(1)
    })
}

export { showUserInfo }
