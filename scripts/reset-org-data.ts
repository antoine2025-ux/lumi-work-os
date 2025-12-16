import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetOrgData() {
  try {
    console.log('Deleting all org data...')
    
    // Delete in correct order (respecting foreign keys)
    // 1. Delete role cards (linked to positions)
    const roleCardsDeleted = await prisma.roleCard.deleteMany({})
    console.log(`Deleted ${roleCardsDeleted.count} role cards`)
    
    // 2. Delete positions (linked to teams)
    const positionsDeleted = await prisma.orgPosition.deleteMany({})
    console.log(`Deleted ${positionsDeleted.count} positions`)
    
    // 3. Delete teams (linked to departments)
    const teamsDeleted = await prisma.orgTeam.deleteMany({})
    console.log(`Deleted ${teamsDeleted.count} teams`)
    
    // 4. Delete departments
    const departmentsDeleted = await prisma.orgDepartment.deleteMany({})
    console.log(`Deleted ${departmentsDeleted.count} departments`)
    
    console.log('✅ Org data reset complete!')
  } catch (error) {
    console.error('Error resetting org data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetOrgData()

