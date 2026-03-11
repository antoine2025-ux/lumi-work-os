/**
 * Policy Event Listeners
 *
 * Registers event handlers that match incoming events to policies
 * and trigger autonomous execution.
 */

import { on } from '@/lib/events/emit'
import { matchEmailEvent } from './event-matcher'
import { executePolicyRun } from './executor'
import { logger } from '@/lib/logger'
import type { EmailReceivedEvent } from './event-matcher'

export const POLICY_EVENTS = {
  EMAIL_RECEIVED: 'policy.email.received',
} as const

export function initializePolicyListeners(): void {
  on<EmailReceivedEvent>(POLICY_EVENTS.EMAIL_RECEIVED, async (event) => {
    try {
      const policies = await matchEmailEvent(event)
      for (const policy of policies) {
        try {
          await executePolicyRun(policy, `email:${event.threadId}`)
        } catch (err: unknown) {
          logger.error('[PolicyListeners] Failed to execute policy', {
            policyId: policy.id,
            threadId: event.threadId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    } catch (err: unknown) {
      logger.error('[PolicyListeners] Failed to match email event', {
        threadId: event.threadId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
