/**
 * Event Matcher
 *
 * Matches incoming events (email received, task status change, etc.) to
 * policies that should be triggered. Includes deduplication to prevent
 * the same event from triggering a policy twice.
 */

import { prismaUnscoped } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { LoopbrainPolicy } from '@prisma/client'

export interface EmailReceivedEvent {
  workspaceId: string
  userId: string
  subject: string
  from: string
  snippet: string
  threadId: string
}

interface EmailKeywordTriggerConfig {
  type: 'EMAIL_KEYWORD'
  keywords: string[]
  fromFilter?: string
}

/**
 * Find all enabled policies whose email keyword trigger matches the given event.
 * Checks subject and snippet for keyword matches (case-insensitive).
 */
export async function matchEmailEvent(
  event: EmailReceivedEvent,
): Promise<LoopbrainPolicy[]> {
  const policies = await prismaUnscoped.loopbrainPolicy.findMany({
    where: {
      enabled: true,
      triggerType: 'EMAIL_KEYWORD',
      workspaceId: event.workspaceId,
      userId: event.userId,
    },
  })

  const matched: LoopbrainPolicy[] = []

  for (const policy of policies) {
    const config = policy.triggerConfig as EmailKeywordTriggerConfig | null
    if (!config?.keywords?.length) continue

    if (config.fromFilter && !event.from.toLowerCase().includes(config.fromFilter.toLowerCase())) {
      continue
    }

    const searchText = `${event.subject} ${event.snippet}`.toLowerCase()
    const hasMatch = config.keywords.some((kw) =>
      searchText.includes(kw.toLowerCase()),
    )

    if (hasMatch) {
      const isDuplicate = await checkDuplicate(policy.id, `email:${event.threadId}`)
      if (!isDuplicate) {
        matched.push(policy)
      }
    }
  }

  if (matched.length > 0) {
    logger.info('[EventMatcher] Email event matched policies', {
      threadId: event.threadId,
      matchedCount: matched.length,
      policyIds: matched.map((p) => p.id),
    })
  }

  return matched
}

/**
 * Check if a policy was already triggered by this exact event source.
 * Prevents duplicate executions from repeated cron syncs.
 */
async function checkDuplicate(
  policyId: string,
  triggerSource: string,
): Promise<boolean> {
  const existing = await prismaUnscoped.policyExecution.findFirst({
    where: {
      policyId,
      triggerSource,
      startedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true },
  })

  return existing !== null
}
