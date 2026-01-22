/**
 * Migration Script: Convert OPS_ALLOWED_EMAILS to isPlatformAdmin flag
 * 
 * This script reads the OPS_ALLOWED_EMAILS environment variable and updates
 * matching users to have isPlatformAdmin = true.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-platform-admins.ts
 * 
 * Or with environment variable override:
 *   OPS_ALLOWED_EMAILS="admin@example.com,ops@example.com" npx ts-node scripts/migrate-platform-admins.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePlatformAdmins() {
  console.log('🔄 Starting platform admin migration...\n')

  // Read emails from environment variable
  const allowedEmailsEnv = process.env.OPS_ALLOWED_EMAILS
  
  if (!allowedEmailsEnv) {
    console.log('⚠️  OPS_ALLOWED_EMAILS environment variable is not set.')
    console.log('   No users to migrate.')
    console.log('\n   To run this migration, set the environment variable:')
    console.log('   OPS_ALLOWED_EMAILS="email1@example.com,email2@example.com" npx ts-node scripts/migrate-platform-admins.ts')
    return
  }

  const emails = allowedEmailsEnv
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0)

  if (emails.length === 0) {
    console.log('⚠️  OPS_ALLOWED_EMAILS is set but contains no valid emails.')
    return
  }

  console.log(`📧 Found ${emails.length} email(s) in OPS_ALLOWED_EMAILS:`)
  emails.forEach(email => console.log(`   - ${email}`))
  console.log('')

  // Track results
  const results: { email: string; status: 'updated' | 'already_admin' | 'not_found' }[] = []

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isPlatformAdmin: true },
    })

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      results.push({ email, status: 'not_found' })
      continue
    }

    if (user.isPlatformAdmin) {
      console.log(`✅ Already admin: ${email} (${user.name || 'no name'})`)
      results.push({ email, status: 'already_admin' })
      continue
    }

    // Update user to be platform admin
    await prisma.user.update({
      where: { id: user.id },
      data: { isPlatformAdmin: true },
    })

    console.log(`🔐 Updated to admin: ${email} (${user.name || 'no name'})`)
    results.push({ email, status: 'updated' })
  }

  // Summary
  console.log('\n📊 Migration Summary:')
  console.log(`   Updated:      ${results.filter(r => r.status === 'updated').length}`)
  console.log(`   Already admin: ${results.filter(r => r.status === 'already_admin').length}`)
  console.log(`   Not found:     ${results.filter(r => r.status === 'not_found').length}`)
  console.log('')

  if (results.some(r => r.status === 'not_found')) {
    console.log('⚠️  Some users were not found. They may need to log in first to create their user record.')
  }

  console.log('✅ Migration complete!')
  console.log('')
  console.log('💡 Next steps:')
  console.log('   1. Verify the migrated users can access /ops')
  console.log('   2. Remove OPS_ALLOWED_EMAILS from your environment variables')
}

// Main execution
migratePlatformAdmins()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

