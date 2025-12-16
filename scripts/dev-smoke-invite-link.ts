#!/usr/bin/env ts-node
/**
 * Dev Helper: Generate Workspace Invite Link
 * 
 * Quickly generates an invite link for smoke testing without going through the UI.
 * 
 * Usage:
 *   WORKSPACE_SLUG="my-workspace" TEST_EMAIL="test@example.com" npm run smoke:invites:dev
 * 
 * Or with explicit env vars:
 *   WORKSPACE_SLUG="my-workspace" \
 *   TEST_EMAIL="test+cli@example.com" \
 *   NEXT_PUBLIC_APP_URL="http://localhost:3000" \
 *   npm run smoke:invites:dev
 */

import { randomBytes } from 'crypto'
import { PrismaClient } from '@prisma/client'

// Create unscoped Prisma client for this script
// WorkspaceInvite is not in WORKSPACE_SCOPED_MODELS, so we use unscoped client
const prismaUnscoped = new PrismaClient()

interface InviteOptions {
  workspaceSlug?: string
  workspaceId?: string
  email: string
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
}

async function generateInviteLink() {
  try {
    // Get options from environment or CLI args
    const workspaceSlug = process.env.WORKSPACE_SLUG
    const workspaceId = process.env.WORKSPACE_ID
    const testEmail = process.env.TEST_EMAIL || process.argv[2]
    const role = (process.env.INVITE_ROLE || 'MEMBER') as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Validate inputs
    if (!testEmail) {
      console.error('❌ Error: TEST_EMAIL is required')
      console.error('\nUsage:')
      console.error('  WORKSPACE_SLUG="my-workspace" TEST_EMAIL="test@example.com" npm run smoke:invites:dev')
      console.error('\nOr:')
      console.error('  WORKSPACE_ID="workspace-id" TEST_EMAIL="test@example.com" npm run smoke:invites:dev')
      process.exit(1)
    }

    if (!workspaceSlug && !workspaceId) {
      console.error('❌ Error: Either WORKSPACE_SLUG or WORKSPACE_ID is required')
      console.error('\nUsage:')
      console.error('  WORKSPACE_SLUG="my-workspace" TEST_EMAIL="test@example.com" npm run smoke:invites:dev')
      console.error('\nOr:')
      console.error('  WORKSPACE_ID="workspace-id" TEST_EMAIL="test@example.com" npm run smoke:invites:dev')
      process.exit(1)
    }

    // Resolve workspace
    let workspace
    if (workspaceId) {
      workspace = await prismaUnscoped.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          members: {
            where: {
              role: { in: ['OWNER', 'ADMIN'] }
            },
            take: 1
          }
        }
      })
    } else if (workspaceSlug) {
      workspace = await prismaUnscoped.workspace.findUnique({
        where: { slug: workspaceSlug },
        include: {
          members: {
            where: {
              role: { in: ['OWNER', 'ADMIN'] }
            },
            take: 1
          }
        }
      })
    }

    if (!workspace) {
      console.error(`❌ Error: Workspace not found`)
      if (workspaceSlug) {
        console.error(`   Slug: ${workspaceSlug}`)
      }
      if (workspaceId) {
        console.error(`   ID: ${workspaceId}`)
      }
      process.exit(1)
    }

    if (!workspace.members || workspace.members.length === 0) {
      console.error(`❌ Error: No OWNER or ADMIN found in workspace "${workspace.name}"`)
      console.error(`   Workspace ID: ${workspace.id}`)
      console.error(`   You need at least one OWNER or ADMIN to create invites`)
      process.exit(1)
    }

    const createdByUserId = workspace.members[0].userId

    // Normalize email
    const normalizedEmail = testEmail.toLowerCase().trim()

    // Check for existing pending invite
    const now = new Date()
    const existingInvite = await prismaUnscoped.workspaceInvite.findFirst({
      where: {
        workspaceId: workspace.id,
        email: normalizedEmail,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { gt: now }
      }
    })

    if (existingInvite) {
      console.log(`⚠️  Warning: Existing pending invite found for ${normalizedEmail}`)
      console.log(`   Revoking old invite and creating new one...`)
      
      await prismaUnscoped.workspaceInvite.update({
        where: { id: existingInvite.id },
        data: { revokedAt: now }
      })
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')

    // Default expiry: 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invite (using prismaUnscoped since WorkspaceInvite is not scoped)
    const invite = await prismaUnscoped.workspaceInvite.create({
      data: {
        workspaceId: workspace.id,
        email: normalizedEmail,
        role: role,
        token: token,
        expiresAt: expiresAt,
        createdByUserId: createdByUserId
      }
    })

    // Build invite URL
    const inviteUrl = `${appUrl}/invites/${token}`

    // Output results
    console.log('\n✅ Invite created successfully!\n')
    console.log('📋 Invite Details:')
    console.log(`   Workspace: ${workspace.name} (${workspace.slug})`)
    console.log(`   Email: ${normalizedEmail}`)
    console.log(`   Role: ${role}`)
    console.log(`   Expires: ${expiresAt.toISOString()}`)
    console.log(`   Token: ${token.substring(0, 16)}...`)
    console.log('\n🔗 Invite URL:')
    console.log(`   ${inviteUrl}\n`)
    console.log('📝 Next Steps:')
    console.log('   1. Copy the invite URL above')
    console.log('   2. Open it in a different browser/incognito window')
    console.log('   3. Log in with the email:', normalizedEmail)
    console.log('   4. Accept the invite\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error generating invite link:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
      if (error.stack && process.env.DEBUG) {
        console.error('\nStack trace:')
        console.error(error.stack)
      }
    } else {
      console.error('   Unknown error:', error)
    }
    process.exit(1)
  } finally {
    await prismaUnscoped.$disconnect()
  }
}

// Run the script
generateInviteLink()
