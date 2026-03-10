import { prisma } from '@/lib/db'

/**
 * Get the default space for a user when creating a project
 * 
 * Logic:
 * - If user is on exactly 1 team → use that team's space
 * - If user is on 0 or multiple teams → use General space
 * - If no suitable space exists → return null
 */
export async function getDefaultSpaceForUser(
  userId: string, 
  workspaceId: string
): Promise<string | null> {
  // Get user's teams via OrgPosition
  const userPositions = await prisma.orgPosition.findMany({
    where: { 
      userId, 
      workspaceId,
      isActive: true 
    },
    select: { teamId: true },
  })
  
  const teamIds = [...new Set(
    userPositions.map(p => p.teamId).filter(Boolean)
  )] as string[]
  
  // Single team → find that team's space
  if (teamIds.length === 1) {
    const team = await prisma.orgTeam.findUnique({
      where: { id: teamIds[0] },
      select: { name: true }
    })
    
    if (team) {
      // Find space with matching team name (created in onboarding Phase 2)
      const teamSpace = await prisma.space.findFirst({
        where: {
          workspaceId,
          name: team.name, // Space name matches team name
        },
        select: { id: true }
      })
      
      if (teamSpace) return teamSpace.id
    }
  }
  
  // Multiple teams, no teams, or team space not found → use General space
  const generalSpace = await prisma.space.findFirst({
    where: {
      workspaceId,
      name: 'General',
    },
    select: { id: true }
  })
  
  return generalSpace?.id ?? null
}
