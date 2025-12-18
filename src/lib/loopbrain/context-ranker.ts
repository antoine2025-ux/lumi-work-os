/**
 * Context Ranker
 * 
 * Deterministic ranking of ContextObjects based on query relevance.
 * Uses simple scoring rules: anchor matches, keyword overlap, recency, type boosts.
 * No LLM calls, no external data stores - pure deterministic scoring.
 */

import { ContextObject, ContextObjectType } from '@/lib/context/context-types'
import { LoopbrainMode } from './orchestrator-types'

/**
 * Source of ranking score
 */
export type RankSource = 'anchor' | 'keyword' | 'semantic' | 'recency' | 'typeBoost'

/**
 * Ranked item with score and reasons
 */
export interface Ranked<T> {
  item: T
  score: number
  reasons: RankSource[]
}

/**
 * Anchors from request (context IDs)
 */
export interface Anchors {
  projectId?: string
  pageId?: string
  taskId?: string
  epicId?: string
  teamId?: string
  roleId?: string
}

/**
 * Simple stopwords list (minimal, common English words)
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'where', 'when', 'why', 'how',
  'from', 'into', 'onto', 'up', 'down', 'out', 'off', 'over', 'under', 'about', 'above', 'below',
  'am', 'as', 'if', 'so', 'than', 'then', 'there', 'their', 'them', 'these', 'those', 'too', 'very'
])

/**
 * Tokenize a query string
 * 
 * - Lowercase
 * - Split on non-alphanumerics
 * - Remove very short tokens (<3 chars)
 * - Remove stopwords
 */
export function tokenize(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3 && !STOPWORDS.has(token))
  
  return tokens
}

/**
 * Count overlapping tokens between two arrays
 */
function countOverlappingTokens(tokens1: string[], tokens2: string[]): number {
  const set2 = new Set(tokens2)
  return tokens1.filter(t => set2.has(t)).length
}

/**
 * Calculate recency score (0-15)
 * 
 * Newer items get higher scores
 * - Today: 15
 * - 1 day ago: 14
 * - 7 days ago: 8
 * - 30 days ago: 0
 */
function calculateRecencyScore(updatedAt: Date): number {
  const now = Date.now()
  const updated = updatedAt.getTime()
  const daysAgo = (now - updated) / (1000 * 60 * 60 * 24)
  
  if (daysAgo < 1) return 15
  if (daysAgo < 7) return Math.max(8, 15 - Math.floor(daysAgo))
  if (daysAgo < 30) return Math.max(0, 8 - Math.floor((daysAgo - 7) / 3))
  return 0
}

/**
 * Get type boost for a context object type based on mode
 */
function getTypeBoost(type: ContextObjectType, mode: LoopbrainMode): number {
  if (mode === 'spaces') {
    if (type === 'project' || type === 'task' || type === 'page' || type === 'epic') return 10
    if (type === 'person' || type === 'role' || type === 'team') return 2
    return 0
  }
  
  if (mode === 'org') {
    if (type === 'person' || type === 'role' || type === 'team') return 10
    if (type === 'project' || type === 'task' || type === 'page') return 2
    return 0
  }
  
  if (mode === 'dashboard') {
    if (type === 'project' || type === 'task') return 6
    if (type === 'page') return 4
    if (type === 'person' || type === 'role' || type === 'team') return 4
    return 0
  }
  
  return 0
}

/**
 * Score a ContextObject based on query relevance
 * 
 * Scoring rules:
 * - Anchor match: +100 (if obj.id matches any anchor)
 * - Title token overlap: +8 per token
 * - Tags overlap: +4 per token
 * - Summary overlap: +2 per token
 * - Recency: +0..15 (newer = higher)
 * - Type boost: +2..10 (mode-dependent)
 * - Semantic score: +0..30 (if provided)
 */
export function scoreContextObject(
  obj: ContextObject,
  queryTokens: string[],
  anchors: Anchors,
  mode: LoopbrainMode,
  semanticScore?: number
): { score: number; reasons: RankSource[] } {
  let score = 0
  const reasons: RankSource[] = []

  // Anchor match: highest priority
  if (
    anchors.projectId === obj.id ||
    anchors.pageId === obj.id ||
    anchors.taskId === obj.id ||
    anchors.epicId === obj.id ||
    anchors.teamId === obj.id ||
    anchors.roleId === obj.id
  ) {
    score += 100
    reasons.push('anchor')
  }

  // Title token overlap
  const titleTokens = tokenize(obj.title)
  const titleOverlap = countOverlappingTokens(queryTokens, titleTokens)
  if (titleOverlap > 0) {
    score += titleOverlap * 8
    reasons.push('keyword')
  }

  // Tags overlap
  const tagTokens = obj.tags.flatMap(tag => tokenize(tag))
  const tagOverlap = countOverlappingTokens(queryTokens, tagTokens)
  if (tagOverlap > 0) {
    score += tagOverlap * 4
    if (!reasons.includes('keyword')) {
      reasons.push('keyword')
    }
  }

  // Summary overlap
  const summaryTokens = tokenize(obj.summary)
  const summaryOverlap = countOverlappingTokens(queryTokens, summaryTokens)
  if (summaryOverlap > 0) {
    score += summaryOverlap * 2
    if (!reasons.includes('keyword')) {
      reasons.push('keyword')
    }
  }

  // Recency score
  const recencyScore = calculateRecencyScore(obj.updatedAt)
  if (recencyScore > 0) {
    score += recencyScore
    reasons.push('recency')
  }

  // Type boost
  const typeBoost = getTypeBoost(obj.type, mode)
  if (typeBoost > 0) {
    score += typeBoost
    reasons.push('typeBoost')
  }

  // Semantic score (if provided from retrieval)
  if (semanticScore !== undefined && semanticScore > 0) {
    score += semanticScore * 30
    reasons.push('semantic')
  }

  return { score, reasons }
}

/**
 * Parameters for ranking context objects
 */
export interface RankContextObjectsParams {
  mode: LoopbrainMode
  query: string
  anchors: Anchors
  items: ContextObject[]
  retrieved?: Array<{ item: ContextObject; score: number }>
}

/**
 * Rank context objects by relevance
 * 
 * - De-duplicates by (type, id)
 * - Scores each item
 * - Sorts by score descending
 * - Returns ranked items
 */
export function rankContextObjects(
  params: RankContextObjectsParams
): Ranked<ContextObject>[] {
  const { mode, query, anchors, items, retrieved } = params

  // Tokenize query once
  const queryTokens = tokenize(query)

  // Build semantic score map from retrieved items
  const semanticScoreMap = new Map<string, number>()
  if (retrieved) {
    for (const { item, score } of retrieved) {
      const key = `${item.type}:${item.id}`
      semanticScoreMap.set(key, score)
    }
  }

  // De-duplicate by (type, id)
  const seen = new Set<string>()
  const uniqueItems: ContextObject[] = []
  for (const item of items) {
    const key = `${item.type}:${item.id}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueItems.push(item)
    }
  }

  // Score each item
  const ranked: Ranked<ContextObject>[] = uniqueItems.map(item => {
    const key = `${item.type}:${item.id}`
    const semanticScore = semanticScoreMap.get(key)
    
    const { score, reasons } = scoreContextObject(
      item,
      queryTokens,
      anchors,
      mode,
      semanticScore
    )

    return {
      item,
      score,
      reasons,
    }
  })

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score)

  return ranked
}

