#!/usr/bin/env node
/**
 * Minimal manual API test for Phase 1: Position-Based Invites
 * 
 * Prerequisites:
 * 1. Run migration: npx prisma migrate dev --name add_position_invites
 * 2. Have a test workspace with at least one unoccupied position
 * 3. Be authenticated (set AUTH_TOKEN env var or use browser session)
 * 
 * Usage:
 * node scripts/test-phase1-position-invites.js <workspaceId> <positionId> <testEmail>
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function testPhase1() {
  const [workspaceId, positionId, testEmail] = process.argv.slice(2)
  
  if (!workspaceId || !positionId || !testEmail) {
    console.error('Usage: node scripts/test-phase1-position-invites.js <workspaceId> <positionId> <testEmail>')
    process.exit(1)
  }

  console.log('🧪 Phase 1 Position-Based Invites Test\n')
  console.log(`Workspace ID: ${workspaceId}`)
  console.log(`Position ID: ${positionId}`)
  console.log(`Test Email: ${testEmail}\n`)

  // Test 1: Create position-based invite (should reject OWNER)
  console.log('Test 1: Create position-based invite with OWNER role (should fail)')
  try {
    const ownerInviteRes = await fetch(`${BASE_URL}/api/org/positions/${positionId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, role: 'OWNER' })
    })
    const ownerInviteData = await ownerInviteRes.json()
    if (ownerInviteRes.status === 400 && ownerInviteData.error?.includes('OWNER role cannot be assigned')) {
      console.log('✅ OWNER role correctly rejected for position-based invites\n')
    } else {
      console.error('❌ Expected 400 error rejecting OWNER role, got:', ownerInviteRes.status, ownerInviteData)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error testing OWNER rejection:', error.message)
    process.exit(1)
  }

  // Test 2: Create position-based invite with MEMBER role
  console.log('Test 2: Create position-based invite with MEMBER role')
  let inviteToken
  try {
    const inviteRes = await fetch(`${BASE_URL}/api/org/positions/${positionId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, role: 'MEMBER' })
    })
    const inviteData = await inviteRes.json()
    if (inviteRes.ok && inviteData.token) {
      inviteToken = inviteData.token
      console.log(`✅ Invite created: ${inviteToken}`)
      console.log(`   Position ID: ${inviteData.positionId}`)
      console.log(`   Role: ${inviteData.role}\n`)
    } else {
      console.error('❌ Failed to create invite:', inviteRes.status, inviteData)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error creating invite:', error.message)
    process.exit(1)
  }

  // Test 3: Accept invite (requires authenticated session)
  console.log('Test 3: Accept invite')
  console.log('⚠️  Note: This requires an authenticated session.')
  console.log(`   Visit: ${BASE_URL}/invites/${inviteToken}`)
  console.log('   After accepting, verify:')
  console.log(`   1. orgPosition.userId = authenticated user ID`)
  console.log(`   2. workspaceMember.role = MEMBER`)
  console.log(`   3. workspaceInvite.acceptedAt is set\n`)

  console.log('✅ Phase 1 hardening tests passed!')
  console.log('\nNext steps:')
  console.log('1. Run migration: npx prisma migrate dev --name add_position_invites')
  console.log('2. Manually test invite acceptance flow')
  console.log('3. Verify database state after acceptance')
}

testPhase1().catch(console.error)

