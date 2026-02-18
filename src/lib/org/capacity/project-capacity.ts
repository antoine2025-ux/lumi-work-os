/**
 * Project-specific capacity helpers
 *
 * Creates WorkAllocations for project assignments using the current schema
 * (personId, allocationPercent, contextType, contextId).
 */

import { prisma } from '@/lib/db'
import { startOfWeek, addWeeks } from 'date-fns'
import { AllocationContextType, AllocationSource } from '@prisma/client'
import {
  getCapacityContracts,
  resolveContractForWindow,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
} from './read'
import { getWorkAllocations, computeTotalAllocatedHoursForWindow } from '@/lib/org/allocations'

export interface CanTakeOnWorkResult {
  canTake: boolean
  reason?: string
  currentPct: number
}

/**
 * Create a WorkAllocation for a project assignment.
 * Resolves orgPositionId to personId for the current schema.
 */
export async function createProjectAllocation(params: {
  workspaceId: string
  orgPositionId: string
  projectId: string
  hoursAllocated: number
  description?: string
}): Promise<void> {
  const { workspaceId, orgPositionId, projectId, hoursAllocated } = params
  const orgPosition = await prisma.orgPosition.findUnique({
    where: { id: orgPositionId },
    select: { userId: true },
  })
  if (!orgPosition?.userId) {
    throw new Error('OrgPosition not found or has no userId')
  }
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const allocationPercent = Math.min(hoursAllocated / 40, 1)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  })
  await prisma.workAllocation.create({
    data: {
      workspaceId,
      personId: orgPosition.userId,
      allocationPercent,
      contextType: AllocationContextType.PROJECT,
      contextId: projectId,
      contextLabel: project?.name ?? 'Project',
      startDate: weekStart,
      endDate: null,
      source: AllocationSource.MANUAL,
    },
  })
}

/**
 * Idempotently create an INTEGRATION WorkAllocation when a person is added to a project.
 * Skips creation if any allocation already exists for this person+project (avoids overwriting manual ones).
 */
export async function upsertIntegrationAllocation(
  workspaceId: string,
  userId: string,
  projectId: string,
  createdById: string
): Promise<void> {
  const existing = await prisma.workAllocation.findFirst({
    where: {
      workspaceId,
      personId: userId,
      contextType: AllocationContextType.PROJECT,
      contextId: projectId,
    },
    select: { id: true },
  })
  if (existing) return

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, endDate: true },
  })

  await prisma.workAllocation.create({
    data: {
      workspaceId,
      personId: userId,
      allocationPercent: 0.25,
      contextType: AllocationContextType.PROJECT,
      contextId: projectId,
      contextLabel: project?.name ?? 'Project',
      startDate: new Date(),
      endDate: project?.endDate ?? null,
      source: AllocationSource.INTEGRATION,
      createdById,
    },
  })
}

/**
 * Remove the INTEGRATION WorkAllocation when a person is removed from a project.
 * Never deletes manually created (source=MANUAL) allocations.
 */
export async function removeIntegrationAllocation(
  workspaceId: string,
  userId: string,
  projectId: string
): Promise<void> {
  await prisma.workAllocation.deleteMany({
    where: {
      workspaceId,
      personId: userId,
      contextType: AllocationContextType.PROJECT,
      contextId: projectId,
      source: AllocationSource.INTEGRATION,
    },
  })
}

/**
 * Set endDate=today on all open INTEGRATION allocations for a project.
 * Called when a project transitions to COMPLETED or CANCELLED.
 */
export async function closeIntegrationAllocations(
  workspaceId: string,
  projectId: string
): Promise<void> {
  await prisma.workAllocation.updateMany({
    where: {
      workspaceId,
      contextType: AllocationContextType.PROJECT,
      contextId: projectId,
      source: AllocationSource.INTEGRATION,
      endDate: null,
    },
    data: { endDate: new Date() },
  })
}

/**
 * Check if a person can take on additional work without exceeding capacity.
 */
export async function canTakeOnWork(
  userId: string,
  workspaceId: string,
  estimatedHours: number,
  windowDays: number = 120
): Promise<CanTakeOnWorkResult> {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const weekEnd = addWeeks(weekStart, Math.ceil(windowDays / 7))
  const timeWindow = { start: weekStart, end: weekEnd }
  const [contracts, allocations] = await Promise.all([
    getCapacityContracts(workspaceId, userId),
    getWorkAllocations(workspaceId, userId, timeWindow),
  ])
  const resolution = resolveContractForWindow(contracts, timeWindow)
  const weeklyCapacity = resolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS
  const { totalHours: allocatedHours } = computeTotalAllocatedHoursForWindow(
    allocations,
    weeklyCapacity,
    timeWindow
  )
  const currentPct = (allocatedHours / weeklyCapacity) * 100
  const newPct = ((allocatedHours + estimatedHours) / weeklyCapacity) * 100
  if (newPct > 100) {
    return {
      canTake: false,
      reason: `Would exceed capacity (${Math.round(newPct)}% vs 40h/week)`,
      currentPct: Math.round(currentPct),
    }
  }
  return { canTake: true, currentPct: Math.round(currentPct) }
}
