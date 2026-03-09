/**
 * Context filtering for Loopbrain agent tools.
 *
 * Strips sensitive fields from person/capacity data based on the
 * caller's role and hierarchy relationship. Delegates to existing
 * getProfilePermissions for field-level decisions.
 */

import { getProfilePermissions } from '@/lib/org/permissions/profile-permissions'
import type { AgentContext } from '../agent/types'
import { hasToolRole } from './index'
import { getAccessiblePersonIds } from './hierarchy'

// Fields that are stripped for users without manager/admin access
const SENSITIVE_PERSON_FIELDS = [
  'salary',
  'performanceReview',
  'personalNotes',
  'compensationBand',
] as const

const SENSITIVE_CAPACITY_FIELDS = [
  'allocation',
  'utilization',
  'billableHours',
  'costRate',
] as const

/**
 * Filter person data based on the caller's relationship to the person.
 * Admins and self-access see all fields. Managers see most fields.
 * Others get sensitive fields stripped.
 */
export async function filterPersonData(
  person: Record<string, unknown>,
  context: AgentContext,
): Promise<Record<string, unknown>> {
  const personUserId = (person.userId as string) ?? (person.id as string)
  if (!personUserId) return person

  // Self-access: full data
  if (personUserId === context.userId) return person

  // Admin/Owner: full data
  if (hasToolRole(context, 'ADMIN')) return person

  // Use existing profile permissions to determine access level
  const perms = await getProfilePermissions(context.userId, personUserId, context.workspaceId)

  if (perms.permissionLevel === 'admin' || perms.permissionLevel === 'edit') {
    return person
  }

  // Strip sensitive fields for non-managers
  const filtered = { ...person }
  for (const field of SENSITIVE_PERSON_FIELDS) {
    delete filtered[field]
  }
  return filtered
}

/**
 * Filter capacity/allocation data.
 * Only managers and admins see detailed allocation percentages.
 */
export async function filterCapacityData(
  capacity: Record<string, unknown>,
  context: AgentContext,
): Promise<Record<string, unknown>> {
  const personId = capacity.personId as string
  if (!personId) return capacity

  // Self-access
  if (personId === context.userId || personId === context.personId) return capacity

  // Admin/Owner: full data
  if (hasToolRole(context, 'ADMIN')) return capacity

  // Check manager relationship via profile permissions
  const perms = await getProfilePermissions(context.userId, personId, context.workspaceId)

  if (perms.permissionLevel === 'admin' || perms.permissionLevel === 'edit') {
    return capacity
  }

  // Strip sensitive capacity fields — return only high-level availability
  const filtered = { ...capacity }
  for (const field of SENSITIVE_CAPACITY_FIELDS) {
    delete filtered[field]
  }
  return filtered
}

/**
 * Filter an array of person records, removing entries the caller
 * cannot access and stripping sensitive fields from the rest.
 */
export async function filterPersonList(
  people: Record<string, unknown>[],
  context: AgentContext,
): Promise<Record<string, unknown>[]> {
  if (hasToolRole(context, 'ADMIN')) return people

  const accessibleIds = new Set(await getAccessiblePersonIds(context))

  const filtered: Record<string, unknown>[] = []
  for (const person of people) {
    const personId = (person.userId as string) ?? (person.id as string)
    // For list views, non-managers can still see basic public info about all workspace members
    // but sensitive fields are stripped
    const safe = await filterPersonData(person, context)
    filtered.push(safe)
  }

  return filtered
}

/**
 * Filter org context data (people + capacity) by hierarchy access.
 * Used when building org context for Loopbrain prompts.
 */
export async function filterOrgContextForRole(
  orgData: {
    people?: Record<string, unknown>[]
    capacity?: Record<string, unknown>[]
    teams?: Record<string, unknown>[]
  },
  context: AgentContext,
): Promise<typeof orgData> {
  if (hasToolRole(context, 'ADMIN')) return orgData

  const accessibleIds = new Set(await getAccessiblePersonIds(context))

  const result = { ...orgData }

  if (result.people) {
    result.people = await Promise.all(
      result.people.map((p) => filterPersonData(p, context)),
    )
  }

  if (result.capacity) {
    // Only show capacity data for accessible people
    result.capacity = await Promise.all(
      result.capacity
        .filter((c) => {
          const pid = c.personId as string
          return accessibleIds.has(pid)
        })
        .map((c) => filterCapacityData(c, context)),
    )
  }

  return result
}
