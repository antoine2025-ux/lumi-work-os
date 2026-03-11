/**
 * GET /api/integrations/gmail/connect
 * Initiates Gmail OAuth flow. Redirects to Google consent screen.
 * State encodes userId and workspaceId for callback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { getGmailOAuth2Client, GMAIL_SCOPES } from '@/lib/gmail'
import { handleApiError } from '@/lib/api-errors'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    const oauth2Client = getGmailOAuth2Client()
    const state = JSON.stringify({ userId, workspaceId })
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [...GMAIL_SCOPES],
      state,
      prompt: 'consent',
    })

    return Response.redirect(authUrl)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
