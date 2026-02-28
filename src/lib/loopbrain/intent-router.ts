/**
 * Loopbrain Intent Router
 * 
 * Deterministic intent detection and routing for Loopbrain queries.
 * No LLM calls - pure heuristics based on keywords, anchors, and context hints.
 */

import { LoopbrainMode } from './orchestrator-types'
import type { MessageIntent } from './agent/types'

/**
 * Detected intent types
 */
export type LoopbrainIntent =
  | 'task_status'
  | 'task_priority'
  | 'open_loops'
  | 'status_update'
  | 'list_entities'
  | 'find_document'
  | 'summarize'
  | 'who_is_responsible'
  | 'capacity_planning'
  | 'prioritization'
  | 'how_to'
  | 'goal_status'
  | 'goal_progress'
  | 'goal_risk'
  | 'goal_recommendation'
  | 'project_health'
  | 'workload_analysis'
  | 'calendar_availability'
  | 'extract_tasks'
  | 'unknown'

/**
 * Router decision output
 */
export interface RouteDecision {
  intent: LoopbrainIntent
  mode: LoopbrainMode
  anchors: {
    projectId?: string
    pageId?: string
    taskId?: string
    epicId?: string
    teamId?: string
    roleId?: string
  }
  needsClarification: boolean
  clarificationQuestion?: string
  confidence: number // 0..1
  reasons: string[]
}

/**
 * Available context hints (what's available in the workspace)
 */
export interface AvailableContextHints {
  hasOrgPeople?: boolean
  hasProjects?: boolean
  hasTasks?: boolean
  hasPages?: boolean
  hasTeams?: boolean
  hasRoles?: boolean
}

/**
 * Route intent from query
 * 
 * Deterministic routing based on:
 * 1. UI-provided anchors (highest priority)
 * 2. Keyword-based intent detection
 * 3. Mode selection from intent
 * 4. Clarification needs
 */
export function routeIntent(params: {
  query: string
  currentMode: LoopbrainMode
  anchorsFromUI: {
    projectId?: string
    pageId?: string
    taskId?: string
    epicId?: string
    teamId?: string
    roleId?: string
  }
  availableContextHints?: AvailableContextHints
  rankingTop?: Array<{ type: string; id: string; title: string }> // Top 3 from ranking for clarification
}): RouteDecision {
  const { query, currentMode, anchorsFromUI, availableContextHints, rankingTop } = params
  
  const queryLower = query.toLowerCase().trim()
  const tokens = tokenize(queryLower)
  
  const decision: RouteDecision = {
    intent: 'unknown',
    mode: currentMode,
    anchors: { ...anchorsFromUI },
    needsClarification: false,
    confidence: 0.5,
    reasons: []
  }
  
  // 1. Anchor-first routing
  const hasSpacesAnchor = !!(anchorsFromUI.projectId || anchorsFromUI.pageId || anchorsFromUI.taskId || anchorsFromUI.epicId)
  const hasOrgAnchor = !!(anchorsFromUI.teamId || anchorsFromUI.roleId)
  
  if (hasSpacesAnchor) {
    decision.mode = 'spaces'
    decision.reasons.push('UI provided spaces anchor (project/page/task/epic)')
    decision.confidence = 0.9
  } else if (hasOrgAnchor) {
    decision.mode = 'org'
    decision.reasons.push('UI provided org anchor (team/role)')
    decision.confidence = 0.9
  }
  
  // 2. Keyword-based intent detection
  const detectedIntent = detectIntentFromKeywords(queryLower, tokens)
  decision.intent = detectedIntent.intent
  decision.reasons.push(...detectedIntent.reasons)
  
  // 3. Mode selection from intent (override if no strong anchor preference)
  if (!hasSpacesAnchor && !hasOrgAnchor) {
    const modeFromIntent = selectModeFromIntent(
      detectedIntent.intent,
      queryLower,
      tokens,
      availableContextHints
    )
    if (modeFromIntent.mode) {
      decision.mode = modeFromIntent.mode
      decision.reasons.push(...modeFromIntent.reasons)
    }
  } else if (hasSpacesAnchor && detectedIntent.intent === 'capacity_planning') {
    // Capacity planning with spaces anchor might still want org mode
    if (queryLower.includes('who') || queryLower.includes('capacity') || queryLower.includes('available')) {
      decision.mode = 'org'
      decision.reasons.push('Capacity planning query overrides spaces anchor')
      decision.confidence = 0.7
    }
  }
  
  // 4. Clarification detection
  const clarification = detectClarificationNeeds(
    queryLower,
    tokens,
    detectedIntent.intent,
    decision.mode,
    anchorsFromUI,
    availableContextHints,
    rankingTop
  )
  decision.needsClarification = clarification.needs
  decision.clarificationQuestion = clarification.question
  if (clarification.needs) {
    decision.reasons.push(clarification.reason || 'Needs clarification')
    decision.confidence = Math.min(decision.confidence, 0.6) // Lower confidence when clarification needed
  }
  
  // Update confidence based on intent detection quality
  if (detectedIntent.confidence > 0.7) {
    decision.confidence = Math.max(decision.confidence, detectedIntent.confidence)
  }
  
  return decision
}

/**
 * Tokenize query for keyword matching
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3) // Filter very short tokens
    .filter(token => !isStopword(token))
}

/**
 * Simple stopword filter
 */
function isStopword(token: string): boolean {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how'
  ])
  return stopwords.has(token)
}

/**
 * Detect intent from keywords
 */
export function detectIntentFromKeywords(
  queryLower: string,
  _tokens: string[]
): { intent: LoopbrainIntent; confidence: number; reasons: string[] } {
  const reasons: string[] = []
  let confidence = 0.5
  let intent: LoopbrainIntent = 'unknown'
  
  // ----- Meeting task extraction (checked first — highest specificity) -----

  const extractTasksKeywords = [
    'extract tasks', 'action items', 'meeting tasks', 'tasks from notes',
    'what came out of the meeting', 'create tasks from', 'pull out tasks',
    'tasks from this meeting', 'standup tasks', 'meeting action items',
    'extract action items', 'get tasks from', 'pull tasks from',
  ]
  if (extractTasksKeywords.some((kw) => queryLower.includes(kw))) {
    intent = 'extract_tasks'
    confidence = 0.92
    reasons.push('Detected task extraction keywords')
    return { intent, confidence, reasons }
  }

  // ----- Task-specific intents (checked first so they win over generic status_update) -----

  // Task status: user asking about their personal task progress
  const taskStatusKeywords = ['my task', 'my tasks', 'task status', 'overdue task', 'blocked task', 'how am i doing', 'doing with my task', 'task progress', 'my assignments', 'assigned to me']
  const taskStatusRegex = /\b(doing with|progress on|status of)\b.*\btask/
  if (taskStatusKeywords.some(kw => queryLower.includes(kw)) || taskStatusRegex.test(queryLower)) {
    intent = 'task_status'
    confidence = 0.9
    reasons.push('Detected personal task status keywords')
    return { intent, confidence, reasons }
  }

  // Task priority: user asking what to work on next
  const taskPriorityKeywords = ['work on next', 'my priorities', 'most urgent for me', 'what should i focus', 'what to focus on next', 'what should i work', 'my most important']
  if (taskPriorityKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('what') && queryLower.includes('next') && (queryLower.includes('task') || queryLower.includes('work')))) {
    intent = 'task_priority'
    confidence = 0.85
    reasons.push('Detected task priority/next-action keywords')
    return { intent, confidence, reasons }
  }

  // Open loops: user asking what Loopbrain is tracking
  const openLoopsKeywords = ['open loop', 'open loops', 'tracking for me', 'what are you tracking', "what's pending", 'whats pending', 'pending items', 'my pending']
  if (openLoopsKeywords.some(kw => queryLower.includes(kw))) {
    intent = 'open_loops'
    confidence = 0.9
    reasons.push('Detected open loops keywords')
    return { intent, confidence, reasons }
  }

  // Goal progress: user asking about goal tracking
  const goalProgressKeywords = ['goal progress', 'okr progress', 'how are goals', 'goal tracking', 'goals tracking', 'quarterly goals', 'key result progress']
  if (goalProgressKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('progress') && (queryLower.includes('goal') || queryLower.includes('okr')))) {
    intent = 'goal_progress'
    confidence = 0.85
    reasons.push('Detected goal progress keywords')
    return { intent, confidence, reasons }
  }

  // Goal risk: user asking about at-risk goals or risk analysis
  const goalRiskKeywords = ['goal risk', 'goals at risk', 'at risk goals', 'risk score', 'goal analytics', 'goal velocity', 'stalled goals']
  if (goalRiskKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('risk') && queryLower.includes('goal'))) {
    intent = 'goal_risk'
    confidence = 0.88
    reasons.push('Detected goal risk/analytics keywords')
    return { intent, confidence, reasons }
  }

  // Goal recommendation: user asking for suggestions or what to do about goals
  const goalRecKeywords = ['goal recommendation', 'goal suggestion', 'improve goal', 'help with goal', 'what should we do about goal', 'fix goal']
  if (goalRecKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('recommend') && queryLower.includes('goal'))) {
    intent = 'goal_recommendation'
    confidence = 0.85
    reasons.push('Detected goal recommendation keywords')
    return { intent, confidence, reasons }
  }

  // Goal status: user asking about specific goals
  const goalStatusKeywords = ['goal status', 'behind goal', 'which goals', 'company goals', 'team goals']
  if (goalStatusKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('goal') && (queryLower.includes('behind') || queryLower.includes('status')))) {
    intent = 'goal_status'
    confidence = 0.85
    reasons.push('Detected goal status keywords')
    return { intent, confidence, reasons }
  }

  // ----- Project Health & Workload intents -----

  // Project health: user asking about project health, velocity, risks, momentum
  const projectHealthKeywords = ['project health', 'project velocity', 'project risk', 'project momentum', 'project bottleneck', 'sprint velocity', 'cycle time', 'how healthy is']
  const projectHealthRegex = /\b(health|velocity|momentum|bottleneck)\b.*\bproject/
  const projectOnTrackRegex = /\bproject\b.*\b(on track|doing|healthy|at risk)\b/
  if (projectHealthKeywords.some(kw => queryLower.includes(kw)) ||
      projectHealthRegex.test(queryLower) ||
      projectOnTrackRegex.test(queryLower) ||
      (queryLower.includes('project') && queryLower.includes('health'))) {
    intent = 'project_health'
    confidence = 0.88
    reasons.push('Detected project health keywords')
    return { intent, confidence, reasons }
  }

  // Workload analysis: user asking about workload, overloading, capacity usage
  const workloadKeywords = ['workload', 'work load', 'overloaded', 'too much work', 'how busy', 'workload analysis', 'workload balance', 'workload distribution', 'spread too thin', 'task load']
  const workloadRegex = /\bwho\b.*\b(overloaded|overwhelmed|swamped)\b/
  if (workloadKeywords.some(kw => queryLower.includes(kw)) ||
      workloadRegex.test(queryLower)) {
    intent = 'workload_analysis'
    confidence = 0.87
    reasons.push('Detected workload analysis keywords')
    return { intent, confidence, reasons }
  }

  // Calendar availability: user asking about scheduling, free time, availability
  const calendarKeywords = ['when am i free', 'when are you free', 'find time', 'schedule a meeting', 'schedule meeting', 'available slot', 'free slot', 'calendar availability', 'meeting time', 'open slot']
  const calendarAvailRegex = /\b(is|are)\b.*\b(available|free)\b.*\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday)\b/
  const whenFreeRegex = /\bwhen\b.*\b(free|available|open)\b/
  if (calendarKeywords.some(kw => queryLower.includes(kw)) ||
      calendarAvailRegex.test(queryLower) ||
      whenFreeRegex.test(queryLower) ||
      (queryLower.includes('availability') && (queryLower.includes('calendar') || queryLower.includes('schedule')))) {
    intent = 'calendar_availability'
    confidence = 0.86
    reasons.push('Detected calendar availability keywords')
    return { intent, confidence, reasons }
  }

  // ----- Existing intents -----

  // Capacity planning
  const capacityKeywords = ['capacity', 'available', 'timeoff', 'vacation', 'bandwidth', 'allocation', 'next weeks', 'support', 'who can help', 'who can', 'who has time']
  if (capacityKeywords.some(kw => queryLower.includes(kw)) || 
      (queryLower.includes('who') && (queryLower.includes('can') || queryLower.includes('available')))) {
    intent = 'capacity_planning'
    confidence = 0.8
    reasons.push('Detected capacity planning keywords')
  }
  
  // Who is responsible
  const responsibleKeywords = ['owner', 'assignee', 'responsible', 'who owns', 'who handles', 'who is working on', 'who assigned']
  if (responsibleKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('who') && (queryLower.includes('own') || queryLower.includes('assign')))) {
    intent = 'who_is_responsible'
    confidence = 0.8
    reasons.push('Detected responsibility/ownership keywords')
  }
  
  // Status update
  const statusKeywords = ['status', 'progress', 'blocked', 'at risk', 'update', 'how is', 'how are', 'what is the status']
  if (statusKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('how') && (queryLower.includes('going') || queryLower.includes('progress')))) {
    intent = 'status_update'
    confidence = 0.75
    reasons.push('Detected status/progress keywords')
  }
  
  // List entities
  const listKeywords = ['list', 'show', 'what projects', 'what tasks', 'what pages', 'all projects', 'all tasks', 'what exist']
  if (listKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.startsWith('what') && (queryLower.includes('project') || queryLower.includes('task') || queryLower.includes('page')))) {
    intent = 'list_entities'
    confidence = 0.8
    reasons.push('Detected list/show keywords')
  }
  
  // Find document
  const docKeywords = ['doc', 'documentation', 'wiki', 'page', 'policy', 'where is', 'find the', 'locate']
  if (docKeywords.some(kw => queryLower.includes(kw)) ||
      (queryLower.includes('where') && (queryLower.includes('doc') || queryLower.includes('page')))) {
    intent = 'find_document'
    confidence = 0.75
    reasons.push('Detected document/wiki keywords')
  }
  
  // Summarize
  const summarizeKeywords = ['summarize', 'summary', 'tl;dr', 'tldr', 'recap', 'brief', 'overview']
  if (summarizeKeywords.some(kw => queryLower.includes(kw))) {
    intent = 'summarize'
    confidence = 0.85
    reasons.push('Detected summarize keywords')
  }
  
  // Prioritization
  const priorityKeywords = ['prioritize', 'priority', 'top 3', 'most important', 'what should we do first', 'what to focus on', 'urgent']
  if (priorityKeywords.some(kw => queryLower.includes(kw))) {
    intent = 'prioritization'
    confidence = 0.8
    reasons.push('Detected prioritization keywords')
  }
  
  // How to
  const howToKeywords = ['how do we', 'how do i', 'how to', 'how can', 'steps', 'process']
  if (howToKeywords.some(kw => queryLower.includes(kw))) {
    intent = 'how_to'
    confidence = 0.75
    reasons.push('Detected how-to keywords')
  }
  
  return { intent, confidence, reasons }
}

/**
 * Select mode from intent
 */
function selectModeFromIntent(
  intent: LoopbrainIntent,
  queryLower: string,
  tokens: string[],
  availableContextHints?: AvailableContextHints
): { mode?: LoopbrainMode; reasons: string[] } {
  const reasons: string[] = []
  let mode: LoopbrainMode | undefined
  
  switch (intent) {
    case 'task_status':
    case 'task_priority':
      // Task intents always route to spaces (where task context lives)
      mode = 'spaces'
      reasons.push('Task intent requires spaces mode for task context')
      break

    case 'open_loops':
      // Open loops are injected in all modes, keep current
      break

    case 'project_health':
      mode = 'spaces'
      reasons.push('Project health requires spaces mode for project context')
      break

    case 'workload_analysis':
      if (availableContextHints?.hasOrgPeople || availableContextHints?.hasTeams) {
        mode = 'org'
        reasons.push('Workload analysis requires org data for capacity comparison')
      } else {
        mode = 'spaces'
        reasons.push('Workload analysis fallback to spaces (no org data)')
      }
      break

    case 'calendar_availability':
      if (availableContextHints?.hasOrgPeople) {
        mode = 'org'
        reasons.push('Calendar availability uses org data for person context')
      } else {
        mode = 'spaces'
        reasons.push('Calendar availability fallback to spaces')
      }
      break

    case 'capacity_planning':
      // Prefer org if org data exists, else dashboard
      if (availableContextHints?.hasOrgPeople || availableContextHints?.hasTeams || availableContextHints?.hasRoles) {
        mode = 'org'
        reasons.push('Capacity planning requires org data')
      } else {
        mode = 'dashboard'
        reasons.push('Capacity planning fallback to dashboard (no org data)')
      }
      break
      
    case 'who_is_responsible':
      // Prefer spaces if task/project mentioned, else org if people/team mentioned
      if (queryLower.includes('project') || queryLower.includes('task') || queryLower.includes('epic')) {
        mode = 'spaces'
        reasons.push('Responsibility query mentions project/task')
      } else if (queryLower.includes('team') || queryLower.includes('person') || queryLower.includes('people')) {
        mode = 'org'
        reasons.push('Responsibility query mentions team/people')
      } else {
        mode = 'spaces' // Default to spaces for ownership queries
        reasons.push('Responsibility query default to spaces')
      }
      break
      
    case 'find_document':
    case 'how_to':
    case 'summarize':
      // Prefer spaces if page/project anchor exists, else dashboard
      mode = 'spaces'
      reasons.push('Document/how-to/summarize queries prefer spaces mode')
      break
      
    case 'status_update':
      // Prefer spaces if anchored, else dashboard
      mode = 'spaces'
      reasons.push('Status update queries prefer spaces mode')
      break
      
    case 'list_entities':
      // Dashboard for workspace-wide lists, spaces for project-specific
      if (queryLower.includes('project') && !queryLower.includes('my') && !queryLower.includes('this')) {
        mode = 'dashboard'
        reasons.push('List projects query → dashboard')
      } else {
        mode = 'spaces'
        reasons.push('List query default to spaces')
      }
      break
      
    default:
      // Unknown intent - keep current mode
      break
  }
  
  return { mode, reasons }
}

/**
 * Detect if clarification is needed
 */
function detectClarificationNeeds(
  queryLower: string,
  tokens: string[],
  intent: LoopbrainIntent,
  mode: LoopbrainMode,
  anchors: {
    projectId?: string
    pageId?: string
    taskId?: string
    epicId?: string
    teamId?: string
    roleId?: string
  },
  availableContextHints?: AvailableContextHints,
  rankingTop?: Array<{ type: string; id: string; title: string }>
): { needs: boolean; question?: string; reason?: string } {
  // Check if query references an entity name but no anchor is present
  const entityTypes = ['project', 'task', 'page', 'epic', 'document', 'wiki']
  const mentionsEntity = entityTypes.some(type => queryLower.includes(type))
  
  if (mentionsEntity && !anchors.projectId && !anchors.pageId && !anchors.taskId && !anchors.epicId) {
    // Query mentions an entity but no anchor provided
    // Check if we have ranking results to suggest
    if (rankingTop && rankingTop.length > 0) {
      const top3 = rankingTop.slice(0, 3)
      const entityType = entityTypes.find(type => queryLower.includes(type)) || 'item'
      const candidates = top3.map(item => item.title).join(', ')
      
      return {
        needs: true,
        question: `Which ${entityType} do you mean? I see: ${candidates}.`,
        reason: `Query mentions ${entityType} but no anchor provided, ranking found candidates`
      }
    }
  }
  
  // Capacity planning without org data
  if (intent === 'capacity_planning' && mode === 'org' && 
      (!availableContextHints?.hasOrgPeople && !availableContextHints?.hasTeams && !availableContextHints?.hasRoles)) {
    return {
      needs: true,
      question: 'Do you want capacity by team, role, or specific people? I don\'t have org data available.',
      reason: 'Capacity planning query but no org data available'
    }
  }
  
  // Ambiguous entity reference (e.g., "Status of onboarding")
  const ambiguousPatterns = [
    /status of (\w+)/i,
    /what is (\w+)/i,
    /show me (\w+)/i,
    /find (\w+)/i
  ]
  
  for (const pattern of ambiguousPatterns) {
    const match = queryLower.match(pattern)
    if (match && match[1]) {
      const entityName = match[1]
      // Check if it's a common word that might be ambiguous
      const ambiguousWords = ['onboarding', 'project', 'task', 'page', 'document']
      if (ambiguousWords.some(word => entityName.includes(word) || word.includes(entityName))) {
        if (!anchors.projectId && !anchors.pageId && !anchors.taskId && !anchors.epicId) {
          if (rankingTop && rankingTop.length > 0) {
            const top3 = rankingTop.slice(0, 3)
            const candidates = top3.map(item => item.title).join(', ')
            return {
              needs: true,
              question: `Which item do you mean? I see: ${candidates}.`,
              reason: `Ambiguous entity reference: "${entityName}"`
            }
          }
        }
      }
    }
  }
  
  return { needs: false }
}

// ---------------------------------------------------------------------------
// Action vs Question classification (Phase 2 — no LLM, keyword-based)
// ---------------------------------------------------------------------------

const ACTION_VERBS = [
  'create', 'make', 'add', 'set up', 'setup', 'build', 'start',
  'schedule', 'assign', 'move', 'change', 'update', 'remove',
  'delete', 'archive', 'write a wiki', 'draft a doc', 'draft a page',
  'new project', 'new task', 'new goal', 'new page', 'new todo',
]

const QUESTION_ANCHORS = [
  'who', 'what', 'when', 'where', 'how', 'why',
  'is there', 'are there', 'can you tell', 'does',
  'show me', 'tell me', 'explain', 'describe', 'summarize',
]

/** Phrases that indicate the user wants help THINKING, not just executing */
const ADVISORY_SIGNALS = [
  'how should i', 'how would you', 'how do i', 'how can i',
  'what do you think', 'what would you suggest', 'what do you recommend',
  'help me plan', 'help me think', 'help me figure out',
  'suggest', 'recommend', 'advise', 'brainstorm',
  "what's the best way", 'best approach', 'best structure',
  'should i', 'would it make sense', 'ideas for',
  "i'm thinking about", 'i want to', 'i need to figure out',
]

/**
 * Classify whether the user message is a QUESTION (existing Q&A flow),
 * an ACTION (agentic execution), ADVISORY (brainstorming that may lead
 * to action), or HYBRID (both question and action).
 *
 * This runs BEFORE the existing intent router and does NOT replace it.
 * Keyword-based, deterministic — no LLM call.
 */
export function classifyMessageIntent(message: string): MessageIntent {
  const lower = message.toLowerCase().trim()

  const hasAdvisory = ADVISORY_SIGNALS.some((s) => lower.includes(s))
  const hasAction = ACTION_VERBS.some((v) => lower.includes(v))
  const hasQuestion = QUESTION_ANCHORS.some((q) => lower.startsWith(q)) || lower.includes('?')

  // Advisory takes priority — brainstorming phrases route to the planner
  // in advisory mode, not the Q&A pipeline
  if (hasAdvisory) return 'ADVISORY'
  if (hasAction && hasQuestion) return 'HYBRID'
  if (hasAction) return 'ACTION'
  return 'QUESTION'
}

