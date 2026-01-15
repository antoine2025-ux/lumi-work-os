/**
 * Script to create a development workspace for your Google account
 * Usage: npx tsx scripts/create-dev-workspace.ts <your-email>
 * Example: npx tsx scripts/create-dev-workspace.ts skvortsovaleksei@gmail.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createDevWorkspace(email: string) {
  try {
    console.log(`🔍 Looking up user: ${email}`)
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      console.log('💡 Make sure you have logged in at least once so the user account exists.')
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.name} (${user.id})`)

    // Check if user already has a workspace
    const existingWorkspace = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    })

    if (existingWorkspace) {
      console.log(`✅ User already has a workspace: ${existingWorkspace.workspace.name}`)
      console.log(`   Workspace ID: ${existingWorkspace.workspace.id}`)
      console.log(`   Workspace Slug: ${existingWorkspace.workspace.slug}`)
      process.exit(0)
    }

    // Create workspace
    const workspaceName = `${user.name || 'Dev'}'s Workspace`
    const workspaceSlug = `${user.email.split('@')[0]}-dev`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    console.log(`📦 Creating workspace: ${workspaceName}`)
    console.log(`   Slug: ${workspaceSlug}`)

    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        slug: workspaceSlug,
        description: 'Development workspace',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    })

    console.log(`✅ Workspace created successfully!`)
    console.log(`   Workspace ID: ${workspace.id}`)
    console.log(`   Workspace Name: ${workspace.name}`)
    console.log(`   Workspace Slug: ${workspace.slug}`)
    console.log(`\n🎉 You can now access your workspace at: http://localhost:3000/home`)

  } catch (error) {
    console.error('❌ Error creating workspace:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line args
const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide your email address')
  console.log('\nUsage:')
  console.log('  npx tsx scripts/create-dev-workspace.ts <your-email>')
  console.log('\nExample:')
  console.log('  npx tsx scripts/create-dev-workspace.ts skvortsovaleksei@gmail.com')
  process.exit(1)
}

createDevWorkspace(email)

