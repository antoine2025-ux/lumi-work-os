import { PrismaClient, ProjectRole } from '@prisma/client'
import { User } from 'next-auth'

const prisma = new PrismaClient()

/**
 * Assert that the authenticated user has access to the project
 * Throws error if access is denied, returns project and user data if granted
 */
export async function assertProjectAccess(
  user: User,
  projectId: string,
  requiredRole: ProjectRole = ProjectRole.VIEWER
): Promise<{ user: User; project: any; member: any }> {
  if (!user || !user.id) {
    throw new Error('Unauthorized: User not authenticated.')
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId: user.id }
      }
    }
  })

  if (!project) {
    throw new Error('Project not found.')
  }

  const member = project.members[0]

  // Fallback: If member record is missing but user is the creator/owner, allow access
  // This handles edge cases where ProjectMember might not be created yet or is misconfigured
  if (!member) {
    if (project.createdById === user.id || project.ownerId === user.id) {
      // Allow access for creator/owner even if ProjectMember record is missing
      // Return a synthetic member object for consistency
      return { 
        user, 
        project, 
        member: { 
          userId: user.id, 
          role: 'OWNER' as ProjectRole,
          projectId: project.id
        } 
      }
    }
    throw new Error('Forbidden: Insufficient project permissions.')
  }

  if (!hasRequiredRole(member.role, requiredRole)) {
    throw new Error('Forbidden: Insufficient project permissions.')
  }

  return { user, project, member }
}

function hasRequiredRole(userRole: ProjectRole, requiredRole: ProjectRole): boolean {
  const roleHierarchy = [ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN, ProjectRole.OWNER]
  return roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole)
}

/**
 * Check if user has write access to project (MEMBER or higher)
 */
export async function assertProjectWriteAccess(
  user: User,
  projectId: string
): Promise<{ user: User; project: any; member: any }> {
  return assertProjectAccess(user, projectId, ProjectRole.MEMBER)
}

/**
 * Check if user has admin access to project (ADMIN or higher)
 */
export async function assertProjectAdminAccess(
  user: User,
  projectId: string
): Promise<{ user: User; project: any; member: any }> {
  return assertProjectAccess(user, projectId, ProjectRole.ADMIN)
}