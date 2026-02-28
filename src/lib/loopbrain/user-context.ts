/**
 * Loopbrain User Context Resolver
 *
 * Resolves who is asking a question — their workspace role, org position,
 * team, department, manager, active projects, skills, and whether they
 * manage direct reports. This context is injected into every LLM system
 * prompt so Loopbrain tailors answers to the individual's perspective.
 *
 * Design constraints:
 * - ≤2 DB round-trips (two Promise.all batches)
 * - 30s TTL cache — prevents re-querying within the same session
 * - Graceful degradation — returns a safe default when user has no OrgPosition
 */

import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoopbrainUserContext {
  /** The userId that was resolved (for cache key / identity) */
  userId: string
  /** User's display name from WorkspaceMember → User */
  name: string
  /** Workspace role: OWNER | ADMIN | MEMBER | VIEWER */
  role: string
  /** Org title from OrgPosition (e.g. "Senior Engineer") — null if no position */
  title: string | null
  /** OrgPosition.id for this user — null if no position */
  positionId: string | null
  /** OrgTeam.id — null if not in a team */
  teamId: string | null
  /** OrgTeam.name */
  teamName: string | null
  /** OrgDepartment.id — null if team has no department */
  departmentId: string | null
  /** OrgDepartment.name */
  departmentName: string | null
  /** User.id of manager (from OrgPosition parent → user) — null if no manager */
  managerId: string | null
  /** Manager's display name — null if no manager */
  managerName: string | null
  /** IDs of non-archived projects user is a member of */
  activeProjectIds: string[]
  /** Names of non-archived projects user is a member of */
  activeProjectNames: string[]
  /** Skill names from PersonSkill */
  skills: string[]
  /** True if this user is listed as manager in PersonManagerLink for any person */
  isManager: boolean
  /** Sum of ProjectAllocation.fraction for active allocations × 100 (0–100+) */
  capacityUtilization: number | null
}

// ---------------------------------------------------------------------------
// TTL cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  ctx: LoopbrainUserContext
  expiresAt: number
}

const TTL_MS = 30_000
const cache = new Map<string, CacheEntry>()

function cacheKey(userId: string, workspaceId: string): string {
  return `${userId}:${workspaceId}`
}

function getCached(userId: string, workspaceId: string): LoopbrainUserContext | null {
  const entry = cache.get(cacheKey(userId, workspaceId))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(userId, workspaceId))
    return null
  }
  return entry.ctx
}

function setCached(userId: string, workspaceId: string, ctx: LoopbrainUserContext): void {
  cache.set(cacheKey(userId, workspaceId), { ctx, expiresAt: Date.now() + TTL_MS })
}

// ---------------------------------------------------------------------------
// Default fallback
// ---------------------------------------------------------------------------

/**
 * Returns a safe minimal context for users with no org data (freshly onboarded,
 * or invited users who haven't been assigned an org position yet).
 */
export function defaultUserContext(userId: string): LoopbrainUserContext {
  return {
    userId,
    name: 'Unknown',
    role: 'MEMBER',
    title: null,
    positionId: null,
    teamId: null,
    teamName: null,
    departmentId: null,
    departmentName: null,
    managerId: null,
    managerName: null,
    activeProjectIds: [],
    activeProjectNames: [],
    skills: [],
    isManager: false,
    capacityUtilization: null,
  }
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the full user context for Loopbrain in ≤2 DB round-trips.
 *
 * Batch 1 (parallel):
 *   - WorkspaceMember → role + user name
 *   - OrgPosition → title, positionId, team (with department), parent (manager)
 *
 * Batch 2 (parallel):
 *   - ProjectMember → active project IDs + names
 *   - PersonManagerLink.count → isManager flag
 *   - PersonSkill → skill names
 *   - ProjectAllocation.aggregate → capacity utilization
 */
export async function resolveUserContext(
  userId: string,
  workspaceId: string,
): Promise<LoopbrainUserContext> {
  if (!userId || !workspaceId) return defaultUserContext(userId)

  const cached = getCached(userId, workspaceId)
  if (cached) return cached

  // --- Batch 1: identity + org position ---
  const [member, position] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: {
        role: true,
        user: { select: { name: true } },
      },
    }),
    prisma.orgPosition.findFirst({
      where: { workspaceId, userId, isActive: true },
      select: {
        id: true,
        title: true,
        team: {
          select: {
            id: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
        },
        parent: {
          select: {
            userId: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
  ])

  // --- Batch 2: projects, manager status, skills, capacity ---
  const [projectMemberships, directReportCount, skillEntries, allocationAgg] = await Promise.all([
    prisma.projectMember.findMany({
      where: { workspaceId, userId },
      select: {
        project: { select: { id: true, name: true, status: true } },
      },
      take: 20,
    }),
    prisma.personManagerLink.count({
      where: { workspaceId, managerId: userId },
    }),
    prisma.personSkill.findMany({
      where: { workspaceId, personId: userId },
      select: { skill: { select: { name: true } } },
      take: 20,
    }),
    prisma.projectAllocation.aggregate({
      _sum: { fraction: true },
      where: {
        workspaceId,
        personId: userId,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    }),
  ])

  // Build active projects list (exclude completed and cancelled)
  const activeProjects = projectMemberships
    .filter((pm) => pm.project.status !== 'COMPLETED' && pm.project.status !== 'CANCELLED')
    .map((pm) => pm.project)

  // Compute capacity utilization (fraction 0.0–1.0+ → percentage)
  const fractionSum = allocationAgg._sum.fraction
  const capacityUtilization =
    fractionSum !== null && fractionSum !== undefined
      ? Math.round(fractionSum * 100)
      : null

  const ctx: LoopbrainUserContext = {
    userId,
    name: member?.user?.name ?? 'Unknown',
    role: member?.role ?? 'MEMBER',
    title: position?.title ?? null,
    positionId: position?.id ?? null,
    teamId: position?.team?.id ?? null,
    teamName: position?.team?.name ?? null,
    departmentId: position?.team?.department?.id ?? null,
    departmentName: position?.team?.department?.name ?? null,
    managerId: position?.parent?.userId ?? null,
    managerName: position?.parent?.user?.name ?? null,
    activeProjectIds: activeProjects.map((p) => p.id),
    activeProjectNames: activeProjects.map((p) => p.name),
    skills: skillEntries.map((s) => s.skill.name),
    isManager: directReportCount > 0,
    capacityUtilization,
  }

  setCached(userId, workspaceId, ctx)
  return ctx
}

// ---------------------------------------------------------------------------
// Prompt formatter
// ---------------------------------------------------------------------------

/**
 * Formats LoopbrainUserContext as an XML-style block for the LLM system prompt.
 *
 * Returns an empty string for the minimal default context (no org data)
 * to avoid cluttering prompts with empty fields.
 */
export function formatUserContextBlock(ctx: LoopbrainUserContext): string {
  const lines: string[] = []

  lines.push(`<user_context>`)
  lines.push(`The person asking this question has the following context. Tailor your answer to their perspective, role, and access level.`)
  lines.push(``)

  // Identity
  const identityParts: string[] = [`Name: ${ctx.name}`, `Workspace Role: ${ctx.role}`]
  if (ctx.title) identityParts.push(`Org Title: ${ctx.title}`)
  lines.push(identityParts.join(' | '))

  // Org placement
  if (ctx.teamName || ctx.departmentName || ctx.managerName) {
    const orgParts: string[] = []
    if (ctx.teamName) orgParts.push(`Team: ${ctx.teamName}${ctx.departmentName ? ` (${ctx.departmentName} dept)` : ''}`)
    if (ctx.managerName) orgParts.push(`Manager: ${ctx.managerName}`)
    if (orgParts.length > 0) lines.push(orgParts.join(' | '))
  }

  // Projects
  if (ctx.activeProjectNames.length > 0) {
    lines.push(`Active Projects: ${ctx.activeProjectNames.join(', ')}`)
  } else {
    lines.push(`Active Projects: none`)
  }

  // Skills
  if (ctx.skills.length > 0) {
    lines.push(`Skills: ${ctx.skills.slice(0, 10).join(', ')}`)
  }

  // Manager / capacity
  const statusParts: string[] = [`Is Manager: ${ctx.isManager}`]
  if (ctx.capacityUtilization !== null) {
    statusParts.push(`Capacity: ${ctx.capacityUtilization}%`)
  }
  lines.push(statusParts.join(' | '))

  lines.push(``)

  // Tailoring instructions
  const tailoringLines: string[] = []

  if (ctx.title) {
    tailoringLines.push(`- Tailor technical depth and terminology to a ${ctx.title}.`)
  }
  if (ctx.activeProjectNames.length > 0) {
    tailoringLines.push(`- When relevant, emphasize information about their active projects: ${ctx.activeProjectNames.join(', ')}.`)
  }
  if (ctx.isManager) {
    tailoringLines.push(`- This person manages direct reports. When answering about workload, status, or planning, consider team-level impact.`)
  }
  if (ctx.role === 'ADMIN' || ctx.role === 'OWNER') {
    tailoringLines.push(`- This person has admin-level access and may benefit from broader organizational context.`)
  }
  if (tailoringLines.length > 0) {
    tailoringLines.forEach((l) => lines.push(l))
  }

  lines.push(`</user_context>`)

  return lines.join('\n')
}
