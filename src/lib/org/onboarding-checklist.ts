import { prisma } from '@/lib/db'
import { createDepartment, createTeam } from '@/server/org/structure/write'
import type { OrgDepartment, OrgTeam, RoleCard } from '@prisma/client'

export type OnboardingProgress = {
  profileSetup: boolean
  orgStructure: boolean
  firstDepartment: boolean
  firstTeam: boolean
  firstInvite: boolean
  percentComplete: number
  isComplete: boolean
}

/**
 * Get onboarding progress for a workspace
 */
export async function getOnboardingProgress(
  workspaceId: string
): Promise<OnboardingProgress> {
  const state = await prisma.workspaceOnboardingState.findUnique({
    where: { workspaceId },
  })

  if (!state) {
    return {
      profileSetup: false,
      orgStructure: false,
      firstDepartment: false,
      firstTeam: false,
      firstInvite: false,
      percentComplete: 0,
      isComplete: false,
    }
  }

  const steps = [
    state.profileSetup,
    state.orgStructure,
    state.firstDepartment,
    state.firstTeam,
    state.firstInvite,
  ]
  
  const completedSteps = steps.filter(Boolean).length
  const percentComplete = Math.round((completedSteps / steps.length) * 100)

  return {
    profileSetup: state.profileSetup,
    orgStructure: state.orgStructure,
    firstDepartment: state.firstDepartment,
    firstTeam: state.firstTeam,
    firstInvite: state.firstInvite,
    percentComplete,
    isComplete: completedSteps === steps.length,
  }
}

/**
 * Check if workspace onboarding is complete
 */
export async function isOnboardingComplete(
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { onboardingCompletedAt: true },
  })

  return workspace?.onboardingCompletedAt !== null
}

/**
 * Mark a specific onboarding step as complete
 */
export async function markStepComplete(
  workspaceId: string,
  step: keyof Omit<OnboardingProgress, 'percentComplete' | 'isComplete'>
): Promise<void> {
  await prisma.workspaceOnboardingState.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      [step]: true,
    },
    update: {
      [step]: true,
    },
  })
}

/**
 * Create first department for a workspace
 */
export async function createFirstDepartment(
  workspaceId: string,
  name: string,
  description: string,
  ownerPersonId?: string
): Promise<OrgDepartment> {
  const department = await createDepartment({
    name,
    workspaceId,
    ownerPersonId: ownerPersonId || null,
  })

  // Mark department and org structure steps complete
  await markStepComplete(workspaceId, 'firstDepartment')
  await markStepComplete(workspaceId, 'orgStructure')

  return department as OrgDepartment
}

/**
 * Create first team under a department
 */
export async function createFirstTeam(
  workspaceId: string,
  departmentId: string,
  name: string,
  description: string,
  leaderId: string
): Promise<OrgTeam> {
  // Create team using existing service
  const team = await createTeam({
    name,
    departmentId,
    workspaceId,
  })

  // Update team with leaderId (createTeam doesn't support this yet)
  const updatedTeam = await prisma.orgTeam.update({
    where: { id: team.id },
    data: {
      description,
      leaderId,
    },
  })

  // Mark team step complete
  await markStepComplete(workspaceId, 'firstTeam')

  return updatedTeam
}

/**
 * Create a role card/position
 */
export async function createRoleCard(
  workspaceId: string,
  name: string,
  description: string,
  level: string,
  createdById: string
): Promise<RoleCard> {
  return await prisma.roleCard.create({
    data: {
      roleName: name,
      roleDescription: description,
      level,
      workspaceId,
      createdById,
      jobFamily: 'General', // Default job family
    },
  })
}

/**
 * Send first team member invite (creates record only; no email sent).
 * Returns the created invite with token so caller can build a shareable link.
 */
export async function sendFirstInvite(
  workspaceId: string,
  email: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER',
  invitedById: string
): Promise<{ token: string }> {
  const invite = await prisma.orgInvitation.create({
    data: {
      workspaceId,
      email,
      role,
      invitedById,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    select: { token: true },
  })

  await markStepComplete(workspaceId, 'firstInvite')
  return { token: invite.token }
}

/**
 * Complete full onboarding (Phase 1 + Phase 2)
 */
export async function completeFullOnboarding(
  workspaceId: string
): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      onboardingCompletedAt: new Date(),
    },
  })
}
