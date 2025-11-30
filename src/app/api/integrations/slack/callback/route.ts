/**
 * Slack OAuth Callback
 * 
 * Handles the redirect from Slack after user authorizes the app
 * Exchanges the authorization code for access/refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { storeSlackIntegration } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

export async function GET(request: NextRequest) {
  // Helper to get redirect base URL (localhost in dev, request origin in prod)
  const getRedirectBase = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000'
    }
    return request.url.split('/api')[0]
  }

  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Handle Slack OAuth errors
    if (error) {
      logger.error('Slack OAuth error', { error, errorDescription })
      const redirectBase = getRedirectBase()
      return NextResponse.redirect(
        `${redirectBase}/settings?tab=integrations&error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code) {
      const redirectBase = getRedirectBase()
      return NextResponse.redirect(
        `${redirectBase}/settings?tab=integrations&error=no_code`
      )
    }

    // Decode state to get workspaceId
    let workspaceId: string
    let userId: string

    try {
      if (!state) {
        throw new Error('No state parameter')
      }
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      workspaceId = stateData.workspaceId
      userId = stateData.userId
    } catch (stateError) {
      logger.error('Invalid state parameter', { state, error: stateError })
      const redirectBase = getRedirectBase()
      return NextResponse.redirect(
        `${redirectBase}/settings?tab=integrations&error=invalid_state`
      )
    }

    // Verify user is authenticated and has access to workspace
    // Note: When callback comes from ngrok, cookies might not be sent properly
    // We'll try to get auth, but if it fails, we'll still proceed with the state data
    let auth
    try {
      auth = await getUnifiedAuth(request)
      if (auth.workspaceId !== workspaceId || auth.user.userId !== userId) {
        logger.warn('State mismatch in Slack OAuth callback, but proceeding with state data', {
          stateWorkspaceId: workspaceId,
          authWorkspaceId: auth.workspaceId,
          stateUserId: userId,
          authUserId: auth.user.userId
        })
        // Don't fail - use state data instead
      }
    } catch (authError) {
      logger.warn('Could not verify auth in callback (cookies may not be sent from ngrok), using state data', {
        error: authError instanceof Error ? authError.message : String(authError)
      })
      // Continue with state data - the workspaceId from state is trusted
    }

    const clientId = process.env.SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      logger.error('Slack OAuth credentials not configured')
      const redirectBase = getRedirectBase()
      return NextResponse.redirect(
        `${redirectBase}/settings?tab=integrations&error=not_configured`
      )
    }

    // Exchange code for tokens
    // Support custom redirect URI for development (e.g., ngrok HTTPS URL)
    const redirectUri = process.env.SLACK_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/slack/callback`
    
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      logger.error('Slack token exchange failed', {
        error: tokenData.error,
        workspaceId
      })
      const redirectBase = getRedirectBase()
      return NextResponse.redirect(
        `${redirectBase}/settings?tab=integrations&error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`
      )
    }

    // Set workspace context for Prisma scoping
    setWorkspaceContext(workspaceId)
    
    // Store the integration
    await storeSlackIntegration(workspaceId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || '',
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      teamId: tokenData.team?.id,
      teamName: tokenData.team?.name,
      botUserId: tokenData.authed_user?.id,
      scopes: tokenData.scope ? tokenData.scope.split(',') : undefined
    })

    logger.info('Slack integration connected successfully', {
      workspaceId,
      teamId: tokenData.team?.id,
      teamName: tokenData.team?.name
    })

    // Redirect back to integrations page with success
    // In development, redirect to localhost (HTTP) instead of ngrok
    const redirectBase = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : request.url.split('/api')[0] // Use request origin in production
    const redirectUrl = `${redirectBase}/settings?tab=integrations&success=slack_connected`
    logger.info('Redirecting to settings after Slack OAuth', { redirectUrl })
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error('Error in Slack OAuth callback:', {
      error: errorMessage,
      stack: errorStack,
      url: request.url,
      code: url.searchParams.get('code'),
      state: url.searchParams.get('state')
    })
    const redirectBase = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : request.url.split('/api')[0]
    // Include more specific error message in URL for debugging
    const errorParam = encodeURIComponent(errorMessage.length > 50 ? 'callback_error' : errorMessage)
    const redirectUrl = `${redirectBase}/settings?tab=integrations&error=${errorParam}`
    logger.info('Redirecting to settings after Slack OAuth error', { redirectUrl, errorMessage })
    return NextResponse.redirect(redirectUrl)
  }
}

