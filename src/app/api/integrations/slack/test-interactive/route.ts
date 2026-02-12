import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { sendInteractiveSlackMessage, SlackBlockBuilder } from '@/lib/integrations/slack-interactive'
import { getSlackIntegration } from '@/lib/integrations/slack-service'
import { addHours } from 'date-fns'
import { logger } from '@/lib/logger'

/**
 * Test endpoint for interactive Slack messages
 * 
 * POST /api/integrations/slack/test-interactive
 * 
 * Query params:
 * - slackUserId: Slack user ID to send test message to (optional, defaults to bot DM)
 * - channelId: Slack channel ID to send test message to (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    // Get workspace Slack integration
    const integration = await getSlackIntegration(auth.workspaceId)
    if (!integration) {
      return NextResponse.json(
        { error: 'Slack not connected for this workspace' },
        { status: 400 }
      )
    }

    // Get query params for test configuration
    const { searchParams } = new URL(request.url)
    const testSlackUserId = searchParams.get('slackUserId')
    const testChannelId = searchParams.get('channelId')

    // If no channel specified, we need a user ID to open a DM
    if (!testChannelId && !testSlackUserId) {
      return NextResponse.json(
        {
          error: 'Either slackUserId or channelId must be provided',
          hint: 'Add ?slackUserId=U123456 or ?channelId=C123456 to the URL',
          botUserId: integration.config.botUserId,
        },
        { status: 400 }
      )
    }

    // Determine target channel
    let targetChannelId = testChannelId

    // If channelId not provided, open a DM with the user
    if (!targetChannelId && testSlackUserId) {
      logger.info('[Slack Test] Opening DM with user', { slackUserId: testSlackUserId })
      
      // Open a DM channel with the user
      const token = integration.config.accessToken
      const dmResponse = await fetch('https://api.slack.com/api/conversations.open', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: testSlackUserId }),
      })

      const dmResult = await dmResponse.json()
      if (!dmResult.ok) {
        return NextResponse.json(
          { error: `Failed to open DM: ${dmResult.error}` },
          { status: 500 }
        )
      }

      targetChannelId = dmResult.channel.id
      logger.info('[Slack Test] DM channel opened', { channelId: targetChannelId })
    }

    if (!targetChannelId) {
      return NextResponse.json(
        { error: 'Could not determine target channel' },
        { status: 400 }
      )
    }

    // Build test message with interactive buttons
    const blocks = [
      SlackBlockBuilder.header('🧪 Test Interactive Message'),
      SlackBlockBuilder.section(
        '*This is a test approval request*\n\n' +
        'Click the buttons below to test the bidirectional Slack integration. ' +
        'This will create a pending action in the database and track the button click.'
      ),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.fields([
        { label: 'Test Type', value: 'Interactive Buttons' },
        { label: 'Requested By', value: auth.user.email },
        { label: 'Status', value: 'Awaiting Response' },
      ]),
      SlackBlockBuilder.context([
        '⏰ This test action expires in 24 hours',
        '📊 Check the database for `loopbrain_pending_actions` table',
      ]),
    ]

    const buttons = [
      { text: '✅ Approve', value: 'approve', style: 'primary' as const },
      { text: '❌ Deny', value: 'deny', style: 'danger' as const },
    ]

    // Send interactive message
    const result = await sendInteractiveSlackMessage({
      workspaceId: auth.workspaceId,
      slackUserId: testSlackUserId || 'test-user',
      slackChannelId: targetChannelId,
      text: '🧪 Test Interactive Message - Check Slack for buttons',
      blocks,
      buttons,
      pendingAction: {
        type: 'test_action',
        contextType: 'Test',
        contextId: `test-${Date.now()}`,
        contextData: {
          testMessage: 'This is a test',
          triggeredBy: auth.user.email,
          timestamp: new Date().toISOString(),
        },
        createdBy: auth.user.userId,
        assignedTo: auth.user.userId,
        expiresAt: addHours(new Date(), 24),
      },
    })

    logger.info('[Slack Test] Interactive message sent', {
      messageTs: result.messageTs,
      channel: result.channel,
      pendingActionId: result.pendingActionId,
    })

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully! Check your Slack for interactive buttons.',
      details: {
        channel: result.channel,
        messageTs: result.messageTs,
        pendingActionId: result.pendingActionId,
      },
      instructions: [
        '1. Check Slack for a message with "Approve" and "Deny" buttons',
        '2. Click one of the buttons',
        '3. Check server logs for webhook POST event',
        '4. Query database: SELECT * FROM loopbrain_pending_actions WHERE id = \'' + result.pendingActionId + '\'',
        '5. Status should change from AWAITING_RESPONSE to COMPLETED',
      ],
    })
  } catch (error) {
    logger.error('[Slack Test] Error sending test message', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Failed to send test message',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to provide instructions and current Slack connection status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const integration = await getSlackIntegration(auth.workspaceId)

    if (!integration) {
      return NextResponse.json({
        connected: false,
        message: 'Slack is not connected for this workspace',
        action: 'Connect Slack via /api/integrations/slack/connect',
      })
    }

    return NextResponse.json({
      connected: true,
      botUserId: integration.config.botUserId,
      teamName: integration.config.teamName,
      teamId: integration.config.teamId,
      instructions: {
        title: 'Test Interactive Slack Messages',
        steps: [
          '1. Get your Slack user ID (from your Slack profile or by calling /api/integrations/slack/user-info)',
          '2. POST to this endpoint with ?slackUserId=YOUR_USER_ID',
          '3. Check Slack for a message with buttons',
          '4. Click a button and monitor the webhook handler logs',
          '5. Verify the pending action is marked as COMPLETED in the database',
        ],
        example: {
          method: 'POST',
          url: '/api/integrations/slack/test-interactive?slackUserId=U123456789',
          description: 'Sends a test message with buttons to the specified user',
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get Slack status' },
      { status: 500 }
    )
  }
}
