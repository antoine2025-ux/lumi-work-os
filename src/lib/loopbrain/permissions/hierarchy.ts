/**
 * Hierarchy-based permission checks for Loopbrain agent tools.
 *
 * Validates manager-report relationships using OrgPosition.parentId
 * (canonical) and PersonManagerLink (supplementary). Delegates to
 * existing assertManagerOrAdmin where appropriate.
 */

import { prisma } from '@/lib/db'
import type { AgentContext } from '../agent/types'
import { LoopbrainPermissionError, hasToolRole } from './index'

/**
 * Assert the user has hierarchical access to the target person.
 * Passes if: ADMIN/OWNER, direct manager (OrgPosition.parentId),
 * or linked manager (PersonManagerLink).
 *
 * @throws LoopbrainPermissionError with code HIERARCHY_DENIED
 */
export async function assertHierarchyAccess(
  context: AgentContext,
  targetPersonId: string,
): Promise<void> {
  if (hasToolRole(context, 'ADMIN')) return

  // Self-access is always allowed
  if (context.personId && context.personId === targetPersonId) return
  if (context.userId === targetPersonId) return

  if (!context.personId) {
    throw new LoopbrainPermissionError(
      'HIERARCHY_DENIED',
      'User has no org position — cannot verify manager relationship',
    )
  }

  // Check OrgPosition.parentId (canonical manager relationship)
  const targetPosition = await prisma.orgPosition.findFirst({
    where: {
      OR: [
        { id: targetPersonId, workspaceId: context.workspaceId },
        { userId: targetPersonId, workspaceId: context.workspaceId, isActive: true },
      ],
    },
    select: { parentId: true },
  })

  if (targetPosition?.parentId === context.personId) return

  // Check PersonManagerLink (supplementary relationship)
  const managerLink = await prisma.personManagerLink.findFirst({
    where: {
      workspaceId: context.workspaceId,
      managerId: context.userId,
      personId: targetPersonId,
    },
    select: { id: true },
  })

  if (managerLink) return

  // Check team lead relationship
  const isTeamLead = await checkTeamLeadRelationship(context, targetPersonId)
  if (isTeamLead) return

  throw new LoopbrainPermissionError(
    'HIERARCHY_DENIED',
    'User does not have manager or team lead access to the target person',
  )
}

async function checkTeamLeadRelationship(
  context: AgentContext,
  targetPersonId: string,
): Promise<boolean> {
  const ledTeams = await prisma.orgTeam.findMany({
    where: {
      workspaceId: context.workspaceId,
      leaderId: context.userId,
    },
    select: { id: true },
  })

  if (ledTeams.length === 0) return false

  const teamIds = ledTeams.map((t) => t.id)

  const targetInTeam = await prisma.orgPosition.findFirst({
    where: {
      OR: [
        { id: targetPersonId, teamId: { in: teamIds } },
        { userId: targetPersonId, teamId: { in: teamIds }, isActive: true },
      ],
    },
    select: { id: true },
  })

  return !!targetInTeam
}

/**
 * Get all person IDs (OrgPosition IDs and User IDs) the user has
 * hierarchical access to. Includes self, direct reports, and team members.
 *
 * ADMIN/OWNER get all people in the workspace.
 */
export async function getAccessiblePersonIds(context: AgentContext): Promise<string[]> {
  if (hasToolRole(context, 'ADMIN')) {
    const all = await prisma.orgPosition.findMany({
      where: { workspaceId: context.workspaceId, isActive: true },
      select: { id: true, userId: true },
    })
    const ids = new Set<string>()
    for (const p of all) {
      ids.add(p.id)
      if (p.userId) ids.add(p.userId)
    }
    return [...ids]
  }

  const ids = new Set<string>()

  // Always include self
  ids.add(context.userId)
  if (context.personId) ids.add(context.personId)

  if (!context.personId) return [...ids]

  // Direct reports via OrgPosition.parentId
  const directReports = await prisma.orgPosition.findMany({
    where: { parentId: context.personId, workspaceId: context.workspaceId, isActive: true },
    select: { id: true, userId: true },
  })
  for (const r of directReports) {
    ids.add(r.id)
    if (r.userId) ids.add(r.userId)
  }

  // Reports via PersonManagerLink
  const managerLinks = await prisma.personManagerLink.findMany({
    where: { managerId: context.userId, workspaceId: context.workspaceId },
    select: { personId: true },
  })
  for (const l of managerLinks) ids.add(l.personId)

  // Team members from led teams
  const ledTeams = await prisma.orgTeam.findMany({
    where: { workspaceId: context.workspaceId, leaderId: context.userId },
    select: { id: true },
  })

  if (ledTeams.length > 0) {
    const teamMembers = await prisma.orgPosition.findMany({
      where: {
        teamId: { in: ledTeams.map((t) => t.id) },
        workspaceId: context.workspaceId,
        isActive: true,
      },
      select: { id: true, userId: true },
    })
    for (const m of teamMembers) {
      ids.add(m.id)
      if (m.userId) ids.add(m.userId)
    }
  }

  return [...ids]
}
