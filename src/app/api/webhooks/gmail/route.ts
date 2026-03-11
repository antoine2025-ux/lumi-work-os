/**
 * Gmail Push Notification Webhook
 *
 * POST /api/webhooks/gmail
 *
 * Receives push notifications from Google Cloud Pub/Sub when Gmail
 * changes occur. Decodes the Pub/Sub message, processes it in the
 * background, and returns 200 immediately (Google requires fast ack).
 *
 * Auth: Bearer token in Authorization header must match GMAIL_WEBHOOK_SECRET.
 * Configured in the Pub/Sub push subscription.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { initializeEventListeners } from '@/lib/events/init'
import { processGmailNotification } from '@/lib/integrations/gmail/notification-handler'
import type { GmailPushNotification } from '@/lib/integrations/gmail/notification-handler'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

initializeEventListeners()

function verifyWebhookAuth(request: NextRequest): boolean {
  const secret = process.env.GMAIL_WEBHOOK_SECRET
  if (!secret) {
    logger.warn('[Gmail Webhook] GMAIL_WEBHOOK_SECRET not configured')
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token === secret
}

export async function POST(request: NextRequest) {
  if (!verifyWebhookAuth(request)) {
    logger.warn('[Gmail Webhook] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.message?.data) {
      logger.warn('[Gmail Webhook] Missing message.data in payload')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8')
    let notification: GmailPushNotification
    try {
      notification = JSON.parse(decoded) as GmailPushNotification
    } catch {
      logger.warn('[Gmail Webhook] Failed to parse notification data', {
        decoded: decoded.slice(0, 200),
      })
      return NextResponse.json({ error: 'Invalid notification data' }, { status: 400 })
    }

    if (!notification.emailAddress || !notification.historyId) {
      logger.warn('[Gmail Webhook] Missing emailAddress or historyId', { notification })
      return NextResponse.json({ error: 'Incomplete notification' }, { status: 400 })
    }

    logger.info('[Gmail Webhook] Notification received', {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      messageId: body.message.messageId,
    })

    // Process in background -- Google Pub/Sub expects 200 within seconds
    processGmailNotification(notification).catch((err) => {
      logger.error('[Gmail Webhook] Background processing failed', {
        emailAddress: notification.emailAddress,
        error: err instanceof Error ? err.message : String(err),
      })
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logger.error('[Gmail Webhook] Error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
