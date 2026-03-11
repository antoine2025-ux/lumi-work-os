/**
 * Meeting Task Extraction
 *
 * Extracts action items from meeting notes (HTML or plain text), fuzzy-matches
 * mentioned names and projects to workspace IDs, and returns a structured
 * result for user review before any tasks are created.
 */

import { prisma } from '@/lib/db'
import { callLoopbrainLLM } from '@/lib/loopbrain/orchestrator'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ExtractedTask {
  title: string
  description: string | null
  assigneeSuggestion: {
    personId: string | null
    personName: string
    confidence: 'high' | 'medium' | 'low'
    reason: string
  }
  deadlineSuggestion: {
    date: string | null
    source: string
  }
  projectSuggestion: {
    projectId: string | null
    projectName: string | null
    confidence: 'high' | 'medium' | 'low'
  }
  priority: 'urgent' | 'high' | 'medium' | 'low'
  sourceText: string
}

export interface MeetingTaskExtractionResult {
  tasks: ExtractedTask[]
  meetingSummary: string
  attendeesDetected: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags to plain text, collapsing whitespace.
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Truncate text at the last sentence boundary (`.`, `!`, `?`, or `\n`) before
 * `maxChars`, preventing garbled mid-sentence input to the LLM.
 */
export function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const slice = text.slice(0, maxChars)
  const lastBoundary = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf('\n')
  )
  if (lastBoundary > maxChars / 2) {
    return slice.slice(0, lastBoundary + 1).trim()
  }
  return slice.trim()
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

/**
 * Extract action items from meeting notes.
 *
 * Performs 2 DB queries (batched via Promise.all):
 *   1. workspaceMember.findMany → name→userId map
 *   2. project.findMany (ACTIVE/ON_HOLD) → name→projectId map
 *
 * Then calls the LLM once with a structured JSON prompt.
 */
export async function extractTasksFromMeetingNotes(
  content: string,
  workspaceId: string,
  userId: string,
  options?: {
    projectId?: string
    wikiPageId?: string
  }
): Promise<MeetingTaskExtractionResult> {
  const plain = content.startsWith('<') ? stripHtmlToText(content) : content

  // Batch DB queries
  const [members, projects] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        workspaceId,
        status: { in: ['ACTIVE', 'ON_HOLD'] },
      },
      select: { id: true, name: true },
    }),
  ])

  const peopleList = members
    .filter((m) => m.user.name)
    .map((m) => m.user.name as string)

  // Build lookup maps (lowercase → canonical)
  const nameToUserId = new Map<string, string>()
  for (const m of members) {
    if (m.user.name) {
      nameToUserId.set(m.user.name.toLowerCase(), m.user.id)
    }
  }

  const projectNameToId = new Map<string, string>()
  for (const p of projects) {
    if (p.name) {
      projectNameToId.set(p.name.toLowerCase(), p.id)
    }
  }

  const contextProjectId = options?.projectId
  const contextProjectName = contextProjectId
    ? (projects.find((p) => p.id === contextProjectId)?.name ?? null)
    : null

  const systemPrompt = `You are an expert meeting facilitator extracting action items from meeting notes.
Return ONLY a valid JSON object matching the schema below. Do not include markdown fences.

Schema:
{
  "tasks": [
    {
      "title": "string — concise action item title",
      "description": "string | null — one-sentence detail or null",
      "assigneeName": "string — name exactly as it appears in notes, or empty string",
      "deadline": "string | null — ISO date (YYYY-MM-DD) or null",
      "deadlineSource": "Explicitly mentioned | Inferred from meeting cadence | Default 1 week",
      "projectName": "string | null — project name from notes or null",
      "priority": "urgent | high | medium | low",
      "sourceText": "string — the exact sentence or phrase this was extracted from"
    }
  ],
  "meetingSummary": "string — 2-3 sentence summary of the meeting",
  "attendeesDetected": ["string"],
  "confidence": "high | medium | low"
}

Rules:
- Only include genuine action items (tasks assigned to a person or team).
- Look for: "will do", "should", "needs to", "action:", "TODO", "follow up", direct assignments by name.
- Cap at 20 tasks. If more than 20 are found, include the 20 highest-priority ones.
- If a name is ambiguous (multiple possible matches), still include it — confidence will be set to "low".
- Deadline default: 7 days from today if urgency language is present but no explicit date.
- If no action items are found, return an empty tasks array.`

  const today = new Date().toISOString().split('T')[0]
  const peopleListStr = peopleList.length > 0 ? peopleList.join(', ') : '(none)'
  const projectListStr =
    projects.length > 0
      ? projects.map((p) => p.name).join(', ')
      : '(none)'

  const userPrompt = `Today's date: ${today}

Workspace people: ${peopleListStr}
Active projects: ${projectListStr}
${contextProjectName ? `Context project (page is in this project): ${contextProjectName}` : ''}

Meeting notes:
${plain}`

  let raw: string
  try {
    const response = await callLoopbrainLLM(userPrompt, systemPrompt, {
      maxTokens: 3000,
    })
    raw = response.content
  } catch (error: unknown) {
    logger.error('Meeting task extraction LLM call failed', { workspaceId, userId, error })
    throw new Error('Failed to extract tasks from meeting notes. Please try again.')
  }

  // Parse LLM response
  let parsed: {
    tasks: Array<{
      title: string
      description: string | null
      assigneeName: string
      deadline: string | null
      deadlineSource: string
      projectName: string | null
      priority: string
      sourceText: string
    }>
    meetingSummary: string
    attendeesDetected: string[]
    confidence: string
  }

  try {
    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    logger.error('Failed to parse meeting task extraction LLM response', { workspaceId, raw: raw.slice(0, 500) })
    return {
      tasks: [],
      meetingSummary: 'Could not parse meeting notes.',
      attendeesDetected: [],
      confidence: 'low',
    }
  }

  const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 20) : []

  // Resolve names to user IDs (fuzzy)
  const tasks: ExtractedTask[] = rawTasks.map((t) => {
    const nameLower = (t.assigneeName ?? '').toLowerCase().trim()

    let resolvedUserId: string | null = null
    let confidence: 'high' | 'medium' | 'low' = 'low'
    let reason = 'No match found'

    if (nameLower) {
      if (nameToUserId.has(nameLower)) {
        resolvedUserId = nameToUserId.get(nameLower)!
        confidence = 'high'
        reason = 'Mentioned by name'
      } else {
        // Partial match — first name or substring
        const firstNameMatches: string[] = []
        for (const [key, id] of nameToUserId.entries()) {
          const firstName = key.split(' ')[0]
          if (firstName === nameLower || key.includes(nameLower)) {
            firstNameMatches.push(id)
          }
        }
        if (firstNameMatches.length === 1) {
          resolvedUserId = firstNameMatches[0]
          confidence = 'medium'
          reason = 'Partial name match'
        } else if (firstNameMatches.length > 1) {
          resolvedUserId = null
          confidence = 'low'
          reason = 'Ambiguous name — multiple matches'
        }
      }
    }

    // Resolve project
    const projNameRaw = t.projectName ?? null
    const projNameLower = projNameRaw?.toLowerCase().trim() ?? ''
    let resolvedProjectId: string | null = null
    let projectName: string | null = projNameRaw
    let projectConfidence: 'high' | 'medium' | 'low' = 'low'

    if (projNameLower) {
      if (projectNameToId.has(projNameLower)) {
        resolvedProjectId = projectNameToId.get(projNameLower)!
        projectName = projNameRaw
        projectConfidence = 'high'
      } else {
        for (const [key, id] of projectNameToId.entries()) {
          if (key.includes(projNameLower) || projNameLower.includes(key)) {
            resolvedProjectId = id
            projectName = projNameRaw
            projectConfidence = 'medium'
            break
          }
        }
      }
    } else if (contextProjectId && contextProjectName) {
      // Fall back to context project if no project mentioned
      resolvedProjectId = contextProjectId
      projectName = contextProjectName
      projectConfidence = 'medium'
    }

    const priorityValue = (['urgent', 'high', 'medium', 'low'] as const).includes(
      t.priority as 'urgent' | 'high' | 'medium' | 'low'
    )
      ? (t.priority as 'urgent' | 'high' | 'medium' | 'low')
      : 'medium'

    return {
      title: t.title ?? 'Untitled task',
      description: t.description ?? null,
      assigneeSuggestion: {
        personId: resolvedUserId,
        personName: t.assigneeName ?? '',
        confidence,
        reason,
      },
      deadlineSuggestion: {
        date: t.deadline ?? null,
        source: t.deadlineSource ?? 'Default 1 week',
      },
      projectSuggestion: {
        projectId: resolvedProjectId,
        projectName,
        confidence: projectConfidence,
      },
      priority: priorityValue,
      sourceText: t.sourceText ?? '',
    }
  })

  return {
    tasks,
    meetingSummary: parsed.meetingSummary ?? '',
    attendeesDetected: Array.isArray(parsed.attendeesDetected) ? parsed.attendeesDetected : [],
    confidence: (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high' | 'medium' | 'low')
      ? (parsed.confidence as 'high' | 'medium' | 'low')
      : 'medium',
  }
}
