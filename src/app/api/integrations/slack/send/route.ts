/**
 * Send Slack Message API
 * 
 * POST - Send a message to a Slack channel or DM
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { sendSlackMessage } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const sendMessageSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  text: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  threadTs: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    const body = await request.json()
    const parsed = sendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const result = await sendSlackMessage(auth.workspaceId, parsed.data)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ts: result.ts,
      message: 'Message sent successfully'
    })
  } catch (error) {
    logger.error('Error sending Slack message:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Failed to send Slack message' },
      { status: 500 }
    )
  }
}


