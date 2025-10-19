const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkWorkspaceMembership() {
  try {
    const workspaceId = 'cmgscdz9a00018ojfpyygzxaq'
    const userId = 'cmgutbhvl00008oiiw0ymcjqy'
    
    console.log('Checking workspace membership...')
    console.log('Workspace ID:', workspaceId)
    console.log('User ID:', userId)
    
    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: userId
        }
      }
    })
    
    console.log('Membership found:', membership)
    
    if (!membership) {
      console.log('User is not a member of the workspace. Creating membership...')
      
      const newMembership = await prisma.workspaceMember.create({
        data: {
          workspaceId: workspaceId,
          userId: userId,
          role: 'MEMBER'
        }
      })
      
      console.log('Membership created:', newMembership)
    }
    
    // Try to create a test chat session
    console.log('\nTesting chat session creation...')
    const testSession = await prisma.chatSession.create({
      data: {
        title: 'Test Chat',
        model: 'gpt-4-turbo',
        workspaceId: workspaceId,
        userId: userId
      }
    })
    
    console.log('Test session created successfully:', testSession.id)
    
  } catch (error) {
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

checkWorkspaceMembership()
