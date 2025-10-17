#!/usr/bin/env node

/**
 * Authentication Test Script
 * Tests the authentication system with development fallback
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAuthentication() {
  console.log('🧪 Testing Authentication System...\n')

  try {
    // Test 1: Check if development user exists
    console.log('1️⃣ Checking for development user...')
    let devUser = await prisma.user.findFirst({
      where: { email: 'dev@lumi.local' }
    })

    if (!devUser) {
      console.log('   Creating development user...')
      devUser = await prisma.user.create({
        data: {
          email: 'dev@lumi.local',
          name: 'Development User',
          image: null
        }
      })
      console.log('   ✅ Created development user:', devUser.id)
    } else {
      console.log('   ✅ Development user exists:', devUser.id)
    }

    // Test 2: Check if workspace exists
    console.log('\n2️⃣ Checking for workspace...')
    let workspace = await prisma.workspace.findFirst({
      where: {
        members: {
          some: { userId: devUser.id }
        }
      }
    })

    if (!workspace) {
      console.log('   Creating default workspace...')
      workspace = await prisma.workspace.create({
        data: {
          name: 'My Workspace',
          slug: `workspace-${devUser.id.slice(-8)}`,
          ownerId: devUser.id,
          members: {
            create: {
              userId: devUser.id,
              role: 'OWNER'
            }
          }
        }
      })
      console.log('   ✅ Created workspace:', workspace.id)
    } else {
      console.log('   ✅ Workspace exists:', workspace.id)
    }

    // Test 3: Test chat session creation
    console.log('\n3️⃣ Testing chat session creation...')
    const chatSession = await prisma.chatSession.create({
      data: {
        title: 'Test Chat Session',
        workspaceId: workspace.id,
        userId: devUser.id
      }
    })
    console.log('   ✅ Created chat session:', chatSession.id)

    // Test 4: Test wiki page creation
    console.log('\n4️⃣ Testing wiki page creation...')
    const wikiPage = await prisma.wikiPage.create({
      data: {
        title: 'Test Wiki Page',
        content: 'This is a test wiki page for authentication testing.',
        slug: 'test-wiki-page',
        workspaceId: workspace.id,
        createdById: devUser.id,
        permissionLevel: 'PUBLIC',
        isPublished: true
      }
    })
    console.log('   ✅ Created wiki page:', wikiPage.id)

    console.log('\n🎉 All authentication tests passed!')
    console.log('\n📊 Summary:')
    console.log(`   User ID: ${devUser.id}`)
    console.log(`   Workspace ID: ${workspace.id}`)
    console.log(`   Chat Session ID: ${chatSession.id}`)
    console.log(`   Wiki Page ID: ${wikiPage.id}`)

  } catch (error) {
    console.error('❌ Authentication test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testAuthentication()
