/**
 * Delete all workspaces and all associated data.
 * WARNING: Destructive - use only for local dev/testing.
 *
 * Usage: npx tsx scripts/delete-all-workspaces.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.workspace.count()
  if (count === 0) {
    console.log('No workspaces to delete.')
    return
  }

  console.log(`Deleting ${count} workspace(s) and all associated data...`)
  const result = await prisma.workspace.deleteMany({})
  console.log(`✅ Deleted ${result.count} workspace(s).`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
