import { prisma } from '../src/lib/db'

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection healthy')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
