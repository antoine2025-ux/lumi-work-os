/**
 * Add a user to the Acme Analytics workspace
 * Usage: tsx scripts/add-user-to-acme.ts <email> [role]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addUserToAcme() {
  const email = process.argv[2] || 'am@loopwell.io'
  const role = (process.argv[3] || 'ADMIN') as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

  console.log(`\n🔧 Adding user to Acme Analytics workspace...`)
  console.log(`   Email: ${email}`)
  console.log(`   Role: ${role}\n`)

  try {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.log(`   Creating new user: ${email}`)
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          emailVerified: new Date(),
        },
      })
    } else {
      console.log(`   ✓ User exists: ${user.name || email}`)
    }

    // Find Acme workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'acme-analytics' },
    })

    if (!workspace) {
      console.log(`   ❌ Acme Analytics workspace not found`)
      console.log(`   Run: npm run db:seed:acme:fresh`)
      return
    }

    console.log(`   ✓ Found workspace: ${workspace.name}`)

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      console.log(`   ⚠️  User is already a member with role: ${existingMember.role}`)
      
      if (existingMember.role !== role) {
        await prisma.workspaceMember.update({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: user.id,
            },
          },
          data: { role },
        })
        console.log(`   ✓ Updated role from ${existingMember.role} to ${role}`)
      }
    } else {
      // Add as workspace member
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role,
          joinedAt: new Date(),
          employmentStatus: 'ACTIVE',
        },
      })
      console.log(`   ✓ Added as workspace member with role: ${role}`)
    }

    console.log(`\n✅ Success! You can now access Acme Analytics at:`)
    console.log(`   http://localhost:3000/w/acme-analytics\n`)

  } catch (error) {
    console.error(`\n❌ Error:`, error)
  } finally {
    await prisma.$disconnect()
  }
}

addUserToAcme()
