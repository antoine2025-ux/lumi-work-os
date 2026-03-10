/**
 * Loopbrain format-action
 *
 * Human-readable action descriptions and date/time formatting for the action plan UI.
 * Never expose raw JSON or technical field names to users.
 */

/**
 * Format an ISO date string for display.
 * Examples: "March 4, 2026", "tomorrow", "today"
 */
export function formatDate(iso: string): string {
  if (!iso || typeof iso !== 'string') return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (dateOnly.getTime() === today.getTime()) return 'today'
    if (dateOnly.getTime() === tomorrow.getTime()) return 'tomorrow'
    return d.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/**
 * Format a time range for display.
 * Example: "10:00 AM – 11:00 AM"
 */
export function formatTimeRange(startIso: string, endIso: string): string {
  if (!startIso || typeof startIso !== 'string') return ''
  try {
    const start = new Date(startIso)
    const end = endIso ? new Date(endIso) : null
    if (Number.isNaN(start.getTime())) return startIso
    const startStr = start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    if (!end || Number.isNaN(end.getTime())) return startStr
    const endStr = end.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${startStr} – ${endStr}`
  } catch {
    return startIso
  }
}

/**
 * Format an ISO datetime for "on [date] at [time]" display.
 * Example: "March 4, 2026 at 10:00 AM"
 */
export function formatDateTime(iso: string): string {
  if (!iso || typeof iso !== 'string') return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const dateStr = formatDate(iso)
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${dateStr} at ${timeStr}`
  } catch {
    return iso
  }
}

/**
 * Human-readable action description for display.
 * Covers all write tools used by agent-loop and planner.
 */
export function formatActionForUser(
  toolName: string,
  params: Record<string, unknown>
): string {
  const str = (v: unknown): string =>
    v != null && typeof v === 'string' ? v : ''

  switch (toolName) {
    case 'createCalendarEvent': {
      const title = str(params.title ?? params.summary) || 'event'
      const start = str(params.startTime ?? params.startDateTime)
      const end = str(params.endTime ?? params.endDateTime)
      if (start && end) {
        const datePart = formatDate(start)
        const timePart = formatTimeRange(start, end)
        return `Create calendar event "${title}" on ${datePart} at ${timePart}`
      }
      if (start) {
        return `Create calendar event "${title}" on ${formatDateTime(start)}`
      }
      return `Create calendar event "${title}"`
    }

    case 'createMultipleCalendarEvents': {
      const events = (params.events as Array<{ title?: string; startTime?: string; endTime?: string }>) ?? []
      if (events.length === 1) {
        const e = events[0]
        return formatActionForUser('createCalendarEvent', e ?? {})
      }
      return `Create ${events.length} calendar events`
    }

    case 'sendEmail':
      return `Send email to ${str(params.to) || 'recipient'}: ${str(params.subject) || '(no subject)'}`

    case 'replyToEmail':
      return `Reply to email thread${str(params.subject) ? `: ${params.subject}` : ''}`

    case 'createTask':
      return `Create task "${str(params.title) || 'Untitled'}"`

    case 'assignTask':
      return `Assign task to ${str(params.assigneeId) || 'assignee'}`

    case 'updateTaskStatus':
      return `Update task status to ${str(params.status) || 'updated'}`

    case 'createWikiPage':
      return `Create wiki page "${str(params.title) || 'Untitled'}"`

    case 'createGoal':
      return `Create goal "${str(params.title) || 'Untitled'}"`

    case 'createEpic':
      return `Create epic "${str(params.title) || 'Untitled'}"`

    case 'createProject':
      return `Create project "${str(params.name ?? params.title) || 'Untitled'}"`

    case 'updateProject':
      return `Update project`

    case 'addPersonToProject':
    case 'assignToProject':
      return `Add person to project`

    case 'linkProjectToGoal':
      return `Link project to goal`

    case 'addSubtask':
      return `Add subtask to "${str(params.title) || 'task'}"`

    case 'createTodo':
      return `Create todo "${str(params.title ?? params.text) || 'Untitled'}"`

    case 'createPerson':
      return `Create person "${str(params.name) || 'Unknown'}"`

    case 'assignManager':
      return `Assign manager to person`

    case 'createTimeOff': {
      const start = str(params.startDate)
      const end = str(params.endDate)
      if (start && end) {
        return `Create time-off request: ${formatDate(start)} – ${formatDate(end)}`
      }
      return `Create time-off request`
    }

    default:
      return `Perform ${toolName.replace(/([A-Z])/g, ' $1').trim()}`
  }
}
