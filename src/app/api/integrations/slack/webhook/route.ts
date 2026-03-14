import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { handleSlackLoopbrainMessage } from '@/lib/integrations/slack/interactive'
import { sendSlackMessage } from '@/lib/integrations/slack-service'
import { runAgentLoop } from '@/lib/loopbrain/agent-loop'
import { clearPendingPlan } from '@/lib/loopbrain/session-store'

/**
 * Slack Webhook Handler
 *
 * Receives incoming events from Slack:
 * - URL verification challenges
 * - Interactive button clicks
 * - Direct messages
 * - App mentions
 */

/**
 * Verify the Slack request signature using HMAC-SHA256.
 * Reads the raw body text from the provided request object.
 * Uses constant-time comparison to prevent timing attacks.
 * Rejects requests with timestamps older than 5 minutes (replay attack prevention).
 */
async function verifySlackSignature(request: Request): Promise<boolean> {
  const body = await request.text()
  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  if (!timestamp || !signature || !signingSecret) {
    return false
  }

  // Prevent replay attacks — reject if timestamp is older than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return false
  }

  const sigBaseString = `v0:${timestamp}:${body}`
  const expectedSignature =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(sigBaseString).digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    // Buffer lengths differ when signature format is invalid
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse body first to check for URL verification challenge
    const body = await request.json()
    
    logger.info('[Slack Webhook] Received event', { 
      type: body.type,
      hasPayload: !!body.payload 
    })
    
    // Slack URL verification challenge (required for setup)
    // Must happen BEFORE HMAC check — Slack doesn't sign verification requests
    if (body.type === 'url_verification') {
      logger.info('[Slack Webhook] URL verification challenge')
      return NextResponse.json({ challenge: body.challenge })
    }

    // For all other event types, verify HMAC signature
    // Clone the original request and reconstruct body for signature verification
    const clonedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    })
    
    const isValid = await verifySlackSignature(clonedRequest)
    if (!isValid) {
      logger.warn('[Slack Webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Handle different event types
    switch (body.type) {
      case 'event_callback':
        await handleEventCallback(body)
        break
      
      case 'block_actions':
        await handleInteractiveAction(body)
        break
      
      default:
        logger.warn('[Slack Webhook] Unknown event type', { type: body.type })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    logger.error('[Slack Webhook] Error processing event', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Handle Slack event callbacks (messages, mentions, etc.)
 */
async function handleEventCallback(body: any) {
  const event = body.event
  const teamId = body.team_id ?? event.team ?? ''
  
  logger.info('[Slack Event]', { 
    type: event.type,
    channelType: event.channel_type,
    teamId,
  })
  
  switch (event.type) {
    case 'message':
      if (event.channel_type === 'im' && !event.bot_id) {
        // Fire-and-forget — Slack requires 200 within 3s
        handleDirectMessage(event, teamId).catch((err) =>
          logger.error('[Slack Interactive] DM processing failed', { error: err })
        )
      }
      break
    
    case 'app_mention':
      // Fire-and-forget — Slack requires 200 within 3s
      handleMention(event, teamId).catch((err) =>
        logger.error('[Slack Interactive] Mention processing failed', { error: err })
      )
      break
    
    default:
      logger.info('[Slack Event] Unhandled event type', { type: event.type })
  }
}

/**
 * Handle interactive actions (button clicks, menu selections, etc.)
 */
async function handleInteractiveAction(body: any) {
  const payload = typeof body.payload === 'string' 
    ? JSON.parse(body.payload) 
    : body.payload

  const action = payload.actions?.[0]
  if (!action) {
    logger.warn('[Slack Interactive] No action in payload')
    return
  }

  const messageTs = payload.message?.ts || payload.container?.message_ts
  const userId = payload.user?.id
  const actionValue = action.value

  logger.info('[Slack Interactive] Button click', {
    actionId: action.action_id,
    value: actionValue,
    messageTs,
    userId,
  })

  if (!messageTs) {
    logger.warn('[Slack Interactive] No message timestamp found')
    return
  }

  // Find the pending action by message timestamp
  const pendingAction = await prisma.loopbrainPendingAction.findFirst({
    where: {
      slackMessageTs: messageTs,
      status: 'AWAITING_RESPONSE',
    },
  })

  if (!pendingAction) {
    logger.warn('[Slack Interactive] No pending action found', { messageTs })
    return
  }

  // Check if action has expired
  if (pendingAction.expiresAt < new Date()) {
    logger.warn('[Slack Interactive] Action expired', { 
      messageTs,
      expiresAt: pendingAction.expiresAt 
    })
    
    await prisma.loopbrainPendingAction.update({
      where: { id: pendingAction.id },
      data: { status: 'EXPIRED' },
    })
    
    return
  }

  // Route to appropriate handler based on action type
  switch (pendingAction.type) {
    case 'time_off_approval':
      await handleTimeOffApprovalAction(pendingAction, action, userId)
      break
    
    case 'loopbrain_plan_approval':
      await handleLoopbrainPlanAction(pendingAction, action)
      break
    
    default:
      logger.warn('[Slack Interactive] Unknown action type', { 
        type: pendingAction.type 
      })
  }
}

async function handleDirectMessage(event: any, teamId: string) {
  await handleSlackLoopbrainMessage({
    slackUserId: event.user,
    slackTeamId: teamId,
    channelId: event.channel,
    text: event.text || '',
    threadTs: event.thread_ts,
    messageTs: event.ts,
    isDM: true,
  })
}

async function handleMention(event: any, teamId: string) {
  await handleSlackLoopbrainMessage({
    slackUserId: event.user,
    slackTeamId: teamId,
    channelId: event.channel,
    text: event.text || '',
    threadTs: event.thread_ts,
    messageTs: event.ts,
    isDM: false,
  })
}

/**
 * Handle Loopbrain plan approval/cancel button clicks.
 *
 * On approve: re-enters the agent loop with "yes" — the session store already
 * holds the pending plan, so the loop executes it and returns a summary.
 *
 * On cancel: clears the pending plan from the session store.
 */
async function handleLoopbrainPlanAction(
  pendingAction: any,
  action: any
) {
  const isApprove = action.action_id === 'loopbrain_plan_approve'
  const channelId = pendingAction.slackChannelId as string | null
  const messageTs = pendingAction.slackMessageTs as string | null
  const workspaceId = pendingAction.workspaceId as string

  const contextData = pendingAction.contextData as Record<string, unknown> | null
  const conversationId = contextData?.conversationId as string | undefined

  if (!isApprove) {
    // Cancel — clear session pending plan and mark action done
    if (conversationId) {
      try {
        await clearPendingPlan(conversationId)
      } catch {
        // Session may not exist yet — safe to ignore
      }
    }

    await prisma.loopbrainPendingAction.update({
      where: { id: pendingAction.id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    })

    if (channelId && workspaceId) {
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: 'Plan cancelled.',
        threadTs: messageTs ?? undefined,
      })
    }
    return
  }

  // Approve — re-enter agent loop with "yes" to trigger pending-plan execution
  try {
    if (!conversationId) {
      throw new Error('No conversationId in pending action contextData')
    }

    const userId = (contextData?.userId as string) || pendingAction.createdBy
    const userRole = (contextData?.userRole as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER') || 'MEMBER'
    const userContext = (contextData?.userContext as {
      name: string
      email: string
      timezone: string
      workspaceName: string
    }) || { name: 'Unknown', email: '', timezone: 'UTC', workspaceName: 'Workspace' }

    const result = await runAgentLoop({
      workspaceId,
      userId,
      conversationId,
      userMessage: 'yes',
      userRole,
      userContext,
    })

    await prisma.loopbrainPendingAction.update({
      where: { id: pendingAction.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    if (channelId && workspaceId) {
      // Truncate to Slack's text limit
      const responseText = result.response.length > 3000
        ? result.response.slice(0, 2950) + '\n\n_...truncated. View full response in Loopwell._'
        : result.response
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: responseText,
        threadTs: messageTs ?? undefined,
      })
    }
  } catch (err: unknown) {
    logger.error('[Slack Interactive] Plan execution failed', {
      pendingActionId: pendingAction.id,
      error: err instanceof Error ? err.message : String(err),
    })

    if (channelId && workspaceId) {
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: `Something went wrong executing the plan: ${err instanceof Error ? err.message : 'Unknown error'}`,
        threadTs: messageTs ?? undefined,
      })
    }
  }
}

/**
 * Handle time off approval button clicks
 */
async function handleTimeOffApprovalAction(
  pendingAction: any,
  action: any,
  slackUserId: string
) {
  const actionValue = action.value // "approve" or "deny"
  const contextId = pendingAction.contextId // LeaveRequest ID

  logger.info('[Slack Interactive] Processing time off approval', {
    action: actionValue,
    leaveRequestId: contextId,
    slackUserId,
  })

  try {
    // Get the base URL for the API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Execute the approval action via the existing API
    const response = await fetch(
      `${baseUrl}/api/org/leave-requests/${contextId}/approve`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Note: This is an internal call, auth will be handled by the API
          // In a production setup, you'd want to pass proper auth context
        },
        body: JSON.stringify({
          action: actionValue,
          denialReason: actionValue === 'deny' ? 'Denied via Slack' : null,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Approval action failed: ${errorData.error || response.statusText}`)
    }

    // Mark pending action as completed
    await prisma.loopbrainPendingAction.update({
      where: { id: pendingAction.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    logger.info(`[Slack Interactive] Time off ${actionValue}d successfully`, {
      leaveRequestId: contextId,
    })
  } catch (error: unknown) {
    logger.error('[Slack Interactive] Error executing approval action', {
      error: error instanceof Error ? error.message : String(error),
      leaveRequestId: contextId,
      action: actionValue,
    })
    
    // Don't mark as completed if it failed - allow retry
  }
}
