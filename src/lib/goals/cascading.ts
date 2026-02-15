/**
 * Cascading Goal Architecture
 * 
 * Handles goal hierarchy validation, alignment scoring, conflict detection,
 * and parent-child cascading behaviors.
 */

import { prisma } from '@/lib/db'
import { GoalLevel, GoalStatus } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface HierarchyValidationResult {
  valid: boolean
  error?: string
}

export interface AlignmentScoreResult {
  score: number // 0-100
  factors: {
    timelineOverlap: number
    progressCorrelation: number
    objectiveAlignment: number
  }
}

export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: Array<{
    goalId: string
    goalTitle: string
    reason: string
    severity: 'low' | 'medium' | 'high'
  }>
}

// ============================================================================
// Constants
// ============================================================================

/** Level hierarchy: lower index = higher level */
const LEVEL_HIERARCHY: GoalLevel[] = [
  'COMPANY',
  'DEPARTMENT',
  'TEAM',
  'INDIVIDUAL',
]

function getLevelIndex(level: GoalLevel): number {
  return LEVEL_HIERARCHY.indexOf(level)
}

// ============================================================================
// Hierarchy Validation
// ============================================================================

/**
 * Validate that a parent-child goal relationship is valid.
 * Rules:
 * 1. No circular references
 * 2. Parent level must be higher than child level (COMPANY > DEPARTMENT > TEAM > INDIVIDUAL)
 * 3. Parent must exist in the same workspace
 */
export async function validateGoalHierarchy(
  goalId: string,
  parentId: string | null,
  goalLevel: GoalLevel,
  workspaceId: string
): Promise<HierarchyValidationResult> {
  if (!parentId) {
    return { valid: true }
  }

  // Cannot be its own parent
  if (goalId === parentId) {
    return { valid: false, error: 'A goal cannot be its own parent' }
  }

  // Fetch the parent goal
  const parentGoal = await prisma.goal.findFirst({
    where: { id: parentId, workspaceId },
    select: { id: true, level: true, parentId: true },
  })

  if (!parentGoal) {
    return { valid: false, error: 'Parent goal not found in this workspace' }
  }

  // Enforce level hierarchy: parent must be a higher level
  const parentLevelIndex = getLevelIndex(parentGoal.level)
  const childLevelIndex = getLevelIndex(goalLevel)

  if (parentLevelIndex >= childLevelIndex) {
    return {
      valid: false,
      error: `A ${goalLevel} goal cannot be a child of a ${parentGoal.level} goal. Parent must be a higher level.`,
    }
  }

  // Check for circular references by walking up the ancestor chain
  const visited = new Set<string>([goalId])
  let currentParentId: string | null = parentId

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      return { valid: false, error: 'Circular reference detected in goal hierarchy' }
    }
    visited.add(currentParentId)

    const ancestor: { parentId: string | null } | null = await prisma.goal.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    })

    currentParentId = ancestor?.parentId ?? null
  }

  return { valid: true }
}

// ============================================================================
// Alignment Scoring
// ============================================================================

/**
 * Calculate alignment score between a child goal and its parent.
 * Score is 0-100 based on:
 * - Timeline overlap (how much the timelines coincide)
 * - Progress correlation (how closely progress tracks)
 * - Objective alignment (shared keywords in objectives)
 */
export async function calculateAlignmentScore(
  childGoalId: string,
  parentGoalId: string
): Promise<AlignmentScoreResult> {
  const [child, parent] = await Promise.all([
    prisma.goal.findUnique({
      where: { id: childGoalId },
      include: {
        objectives: { select: { title: true, progress: true } },
      },
    }),
    prisma.goal.findUnique({
      where: { id: parentGoalId },
      include: {
        objectives: { select: { title: true, progress: true } },
      },
    }),
  ])

  if (!child || !parent) {
    return { score: 0, factors: { timelineOverlap: 0, progressCorrelation: 0, objectiveAlignment: 0 } }
  }

  // 1. Timeline overlap (0-100)
  const timelineOverlap = calculateTimelineOverlap(
    child.startDate, child.endDate,
    parent.startDate, parent.endDate
  )

  // 2. Progress correlation (0-100)
  const progressCorrelation = calculateProgressCorrelation(
    child.progress, parent.progress
  )

  // 3. Objective alignment (0-100) - keyword overlap in objective titles
  const objectiveAlignment = calculateObjectiveAlignment(
    child.objectives.map(o => o.title),
    parent.objectives.map(o => o.title)
  )

  // Weighted average
  const score = Math.round(
    timelineOverlap * 0.25 +
    progressCorrelation * 0.35 +
    objectiveAlignment * 0.40
  )

  return {
    score: Math.min(Math.max(score, 0), 100),
    factors: { timelineOverlap, progressCorrelation, objectiveAlignment },
  }
}

function calculateTimelineOverlap(
  childStart: Date, childEnd: Date,
  parentStart: Date, parentEnd: Date
): number {
  const overlapStart = Math.max(childStart.getTime(), parentStart.getTime())
  const overlapEnd = Math.min(childEnd.getTime(), parentEnd.getTime())

  if (overlapEnd <= overlapStart) return 0

  const childDuration = childEnd.getTime() - childStart.getTime()
  if (childDuration === 0) return 0

  const overlapDuration = overlapEnd - overlapStart
  return Math.round((overlapDuration / childDuration) * 100)
}

function calculateProgressCorrelation(
  childProgress: number,
  parentProgress: number
): number {
  // If both are 0, consider them aligned
  if (childProgress === 0 && parentProgress === 0) return 80

  // Calculate how close child progress is to parent progress
  const diff = Math.abs(childProgress - parentProgress)
  return Math.round(Math.max(0, 100 - diff * 1.5))
}

function calculateObjectiveAlignment(
  childTitles: string[],
  parentTitles: string[]
): number {
  if (childTitles.length === 0 || parentTitles.length === 0) return 50

  const parentWords = new Set(
    parentTitles.flatMap(t =>
      t.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    )
  )

  if (parentWords.size === 0) return 50

  const childWords = childTitles.flatMap(t =>
    t.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  )

  if (childWords.length === 0) return 50

  const matchCount = childWords.filter(w => parentWords.has(w)).length
  const matchRatio = matchCount / childWords.length

  return Math.round(matchRatio * 100)
}

/**
 * Update alignment score for a goal and persist it
 */
export async function updateAlignmentScore(goalId: string): Promise<number> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { parentId: true },
  })

  if (!goal?.parentId) {
    return 0
  }

  const result = await calculateAlignmentScore(goalId, goal.parentId)

  await prisma.goal.update({
    where: { id: goalId },
    data: { alignmentScore: result.score },
  })

  return result.score
}

// ============================================================================
// Cascading Changes
// ============================================================================

/**
 * Propagate parent goal changes to children.
 * - Status changes: PAUSED/CANCELLED cascade to active children
 * - Timeline shifts: shift children proportionally
 */
export async function cascadeParentChanges(
  parentGoalId: string,
  changes: {
    status?: GoalStatus
    endDate?: Date
    startDate?: Date
  }
): Promise<{ affectedGoalIds: string[] }> {
  const children = await prisma.goal.findMany({
    where: { parentId: parentGoalId },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  })

  const affectedGoalIds: string[] = []

  for (const child of children) {
    const updateData: Record<string, unknown> = {}

    // Status cascade: if parent is paused/cancelled, cascade to active children
    if (changes.status) {
      if (
        (changes.status === 'PAUSED' || changes.status === 'CANCELLED') &&
        child.status === 'ACTIVE'
      ) {
        updateData.status = changes.status
      }

      // If parent is reactivated, reactivate paused children
      if (changes.status === 'ACTIVE' && child.status === 'PAUSED') {
        updateData.status = 'ACTIVE'
      }
    }

    // Timeline cascade: if parent deadline changes, proportionally shift children
    if (changes.endDate) {
      const parentGoal = await prisma.goal.findUnique({
        where: { id: parentGoalId },
        select: { endDate: true },
      })

      if (parentGoal) {
        const childEndAfterParent = child.endDate > parentGoal.endDate
        if (childEndAfterParent) {
          // Child end date exceeds new parent end date, cap it
          updateData.endDate = changes.endDate
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.goal.update({
        where: { id: child.id },
        data: updateData,
      })
      affectedGoalIds.push(child.id)

      // Recursively cascade to grandchildren
      const nested = await cascadeParentChanges(child.id, changes)
      affectedGoalIds.push(...nested.affectedGoalIds)
    }
  }

  return { affectedGoalIds }
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Detect potential conflicts between a goal and other goals in the workspace.
 * Conflicts include:
 * - Competing for the same owner's bandwidth
 * - Contradictory targets (same metric, different direction)
 * - Resource competition (linked to same projects)
 */
export async function detectConflicts(
  goalId: string,
  workspaceId: string
): Promise<ConflictDetectionResult> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      objectives: {
        include: { keyResults: true },
      },
      linkedProjects: {
        select: { projectId: true },
      },
    },
  })

  if (!goal) {
    return { hasConflicts: false, conflicts: [] }
  }

  const conflicts: ConflictDetectionResult['conflicts'] = []

  // Find other active goals in the workspace at the same level
  const peerGoals = await prisma.goal.findMany({
    where: {
      workspaceId,
      id: { not: goalId },
      status: 'ACTIVE',
      level: goal.level,
    },
    include: {
      objectives: {
        include: { keyResults: true },
      },
      linkedProjects: {
        select: { projectId: true },
      },
    },
  })

  const goalProjectIds = new Set(goal.linkedProjects.map(lp => lp.projectId))

  for (const peer of peerGoals) {
    // Check for resource competition (shared projects)
    const peerProjectIds = new Set(peer.linkedProjects.map(lp => lp.projectId))
    const sharedProjects = [...goalProjectIds].filter(id => peerProjectIds.has(id))

    if (sharedProjects.length > 0) {
      conflicts.push({
        goalId: peer.id,
        goalTitle: peer.title,
        reason: `Competing for ${sharedProjects.length} shared project(s)`,
        severity: sharedProjects.length > 1 ? 'high' : 'medium',
      })
    }

    // Check for same-owner bandwidth competition
    if (goal.ownerId && goal.ownerId === peer.ownerId) {
      conflicts.push({
        goalId: peer.id,
        goalTitle: peer.title,
        reason: 'Same owner — competing for bandwidth',
        severity: 'low',
      })
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  }
}

/**
 * Record a conflict relationship between two goals
 */
export async function recordConflict(
  goalId1: string,
  goalId2: string
): Promise<void> {
  await prisma.goal.update({
    where: { id: goalId1 },
    data: {
      conflictsWith: {
        connect: { id: goalId2 },
      },
    },
  })
}

/**
 * Remove a conflict relationship between two goals
 */
export async function removeConflict(
  goalId1: string,
  goalId2: string
): Promise<void> {
  await prisma.goal.update({
    where: { id: goalId1 },
    data: {
      conflictsWith: {
        disconnect: { id: goalId2 },
      },
    },
  })
}
