/**
 * Verify TimeOff Table Exists
 * 
 * Quick check to verify the time_off table exists and is accessible.
 * 
 * Usage:
 *   npx tsx scripts/verify-time-off-table.ts
 */

import { prismaUnscoped } from '../src/lib/db'

async function verifyTimeOffTable() {
  console.log('🔍 Verifying time_off table exists...\n')

  try {
    // Try to query the table
    const result = await prismaUnscoped.timeOff.findFirst({
      take: 1,
    })

    console.log('✅ time_off table exists and is accessible')
    console.log(`   Sample record count check: ${result ? 'Found at least 1 record' : 'Table is empty (expected)'}\n`)

    // Also check table structure
    const tableInfo = await prismaUnscoped.$queryRaw<Array<{
      column_name: string
      data_type: string
    }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'time_off'
      ORDER BY ordinal_position
    `

    if (tableInfo.length > 0) {
      console.log('✅ Table structure verified:')
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`)
      })
    } else {
      console.log('⚠️  Table structure query returned no columns')
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.error('❌ time_off table does NOT exist in database')
      console.error('   Error:', error.message)
      console.error('\n   Action needed: Run migration or db push to create the table')
    } else {
      console.error('❌ Error checking time_off table:', error)
      if (error instanceof Error) {
        console.error('   Message:', error.message)
      }
    }
    throw error
  } finally {
    await prismaUnscoped.$disconnect()
    console.log('\n✅ Prisma client disconnected')
  }
}

verifyTimeOffTable().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})

