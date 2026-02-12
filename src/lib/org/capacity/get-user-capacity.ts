/**
 * Get User Capacity Helper
 *
 * Computes a user's capacity utilization for the current week.
 * Used by dashboard to show personalized capacity metrics.
 */

import { startOfWeek, endOfWeek } from 'date-fns'
import { getCapacityContracts, resolveContractForWindow, DEFAULT_WEEKLY_CAPACITY_HOURS } from './read'
import { getWorkAllocations, computeTotalAllocatedHoursForWindow } from '@/lib/org/allocations'

export interface UserCapacityResult {
  totalCapacity: number
  allocatedHours: number
  utilizationPct: number
}

/**
 * Get capacity utilization for a user in the current week
 */
export async function getUserCapacity(
  userId: string,
  workspaceId: string
): Promise<UserCapacityResult> {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
  const timeWindow = { start: weekStart, end: weekEnd }

  // Get capacity contract
  const contracts = await getCapacityContracts(workspaceId, userId)
  const resolution = resolveContractForWindow(contracts, timeWindow)
  const weeklyCapacity = resolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS

  // Get work allocations
  const allocations = await getWorkAllocations(workspaceId, userId, timeWindow)

  // Compute allocated hours
  const { totalHours: allocatedHours } = computeTotalAllocatedHoursForWindow(
    allocations,
    weeklyCapacity,
    timeWindow
  )

  const utilizationPct = Math.round((allocatedHours / weeklyCapacity) * 100)

  return {
    totalCapacity: weeklyCapacity,
    allocatedHours: Math.round(allocatedHours * 10) / 10, // Round to 1 decimal
    utilizationPct,
  }
}
