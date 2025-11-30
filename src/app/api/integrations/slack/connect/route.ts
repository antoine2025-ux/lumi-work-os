/**
 * Slack OAuth Connect
 * 
 * Initiates Slack OAuth flow by redirecting user to Slack authorization page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })

    const clientId = process.env.SLACK_CLIENT_ID
    if (!clientId) {
      logger.error('Slack client ID not configured', { workspaceId: auth.workspaceId })
      // Redirect back to settings with error message
      return NextResponse.redirect(
        new URL(
          `/settings?tab=integrations&error=${encodeURIComponent('Slack integration is not configured. Please add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to your environment variables.')}`,
          request.url
        )
      )
    }

    // Build Slack OAuth URL
    // Support custom redirect URI for development (e.g., ngrok HTTPS URL)
    const redirectUri = process.env.SLACK_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/slack/callback`
    const scopes = [
      'chat:write',
      'channels:read',
      'channels:history',
      'users:read'
    ].join(',')

    const state = Buffer.from(JSON.stringify({
      workspaceId: auth.workspaceId,
      userId: auth.user.userId
    })).toString('base64')

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
    slackAuthUrl.searchParams.set('client_id', clientId)
    slackAuthUrl.searchParams.set('scope', scopes)
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri)
    slackAuthUrl.searchParams.set('state', state)

    logger.info('Initiating Slack OAuth', { 
      workspaceId: auth.workspaceId,
      redirectUri,
      slackAuthUrl: slackAuthUrl.toString(),
      requestOrigin: request.url
    })

    // Redirect to Slack
    return NextResponse.redirect(slackAuthUrl.toString())
  } catch (error) {
    logger.error('Error initiating Slack OAuth:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    )
  }
}

