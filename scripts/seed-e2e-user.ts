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

const prisma = new PrismaClient()

const E2E_USER_EMAIL = 'e2e@loopwell.test'
const E2E_USER_NAME = 'E2E Test User'
const E2E_WORKSPACE_NAME = 'E2E Test Workspace'
const E2E_WORKSPACE_SLUG = 'e2e-test-workspace'

async function seedE2EUser() {
  console.log('🌱 Seeding E2E test user...')
  
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
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
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

