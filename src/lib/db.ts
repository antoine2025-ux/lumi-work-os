import { PrismaClient } from '@prisma/client'
// import { scopingMiddleware } from './prisma/scopingMiddleware'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client instance
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
  // Connection pooling configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// TODO: Re-enable scoping middleware once Prisma $use issue is resolved
// Add scoping middleware with error handling
// try {
//   if (typeof prismaClient.$use === 'function') {
//     prismaClient.$use(scopingMiddleware)
//   } else {
//     console.warn('Prisma middleware not available - scoping middleware skipped')
//   }
// } catch (error) {
//   console.warn('Failed to add scoping middleware:', error)
// }

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
