import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding basic data...')

  // Create users (employees) first
  const johnDoe = await prisma.user.upsert({
    where: { email: 'john.doe@company.com' },
    update: {},
    create: {
      email: 'john.doe@company.com',
      name: 'John Doe',
    },
  })

  const janeSmith = await prisma.user.upsert({
    where: { email: 'jane.smith@company.com' },
    update: {},
    create: {
      email: 'jane.smith@company.com',
      name: 'Jane Smith',
    },
  })

  // Create a workspace if it doesn't exist
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Workspace',
      slug: 'default',
      ownerId: johnDoe.id,
    },
  })

  // Create workspace members
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        userId: johnDoe.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: johnDoe.id,
      workspaceId: workspace.id,
      role: 'OWNER',
    },
  })

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        userId: janeSmith.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: janeSmith.id,
      workspaceId: workspace.id,
      role: 'ADMIN',
    },
  })

  console.log('✅ Basic seeding completed!')
  console.log(`Created workspace: ${workspace.name}`)
  console.log(`Created users: ${johnDoe.name}, ${janeSmith.name}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
