const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getWorkspaceId() {
  try {
    const workspaces = await prisma.workspace.findMany()
    console.log('Workspaces found:')
    workspaces.forEach(ws => {
      console.log(`- ID: ${ws.id}, Name: ${ws.name}`)
    })
    
    const users = await prisma.user.findMany()
    console.log('\nUsers found:')
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.name}`)
    })
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

getWorkspaceId()
