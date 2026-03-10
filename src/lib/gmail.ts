/**
 * Gmail API client helpers.
 * Uses Integration model (workspace-scoped) with per-user tokens in config.
 */

import { google, gmail_v1 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
] as const

export interface GmailTokens {
  accessToken: string
  refreshToken?: string | null
}

export interface GmailIntegrationConfig {
  users?: Record<string, { accessToken: string; refreshToken?: string | null }>
}

export function getGmailOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GMAIL_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/gmail/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth not configured: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (or GOOGLE_*) required')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getGmailClient(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: 'v1', auth })
}

export interface ParsedEmailAddress {
  name: string
  email: string
}

export function parseEmailAddress(raw?: string | null): ParsedEmailAddress {
  if (!raw || !raw.trim()) {
    return { name: 'Unknown', email: '' }
  }
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim() }
  }
  if (raw.includes('@')) {
    return { name: raw.split('@')[0] || 'Unknown', email: raw.trim() }
  }
  return { name: raw.trim(), email: '' }
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined
}

function getMessageBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return ''
  if (payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    } catch {
      return ''
    }
  }
  const parts = payload.parts
  if (!parts?.length) return ''
  const htmlPart = parts.find((p) => p.mimeType === 'text/html')
  const textPart = parts.find((p) => p.mimeType === 'text/plain')
  const part = htmlPart || textPart
  if (part?.body?.data) {
    try {
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    } catch {
      return ''
    }
  }
  return parts.map((p) => getMessageBody(p)).join('\n\n')
}

export interface ParsedGmailMessage {
  id: string
  threadId?: string
  subject: string
  from: ParsedEmailAddress
  to: ParsedEmailAddress
  date: string
  snippet: string
  body: string
  isUnread: boolean
}

export function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedGmailMessage {
  const headers = message.payload?.headers || []
  const getH = (name: string) => getHeader(headers, name)

  return {
    id: message.id || '',
    threadId: message.threadId ?? undefined,
    subject: getH('Subject') || '(No subject)',
    from: parseEmailAddress(getH('From')),
    to: parseEmailAddress(getH('To')),
    date: getH('Date') || '',
    snippet: message.snippet || '',
    body: getMessageBody(message.payload),
    isUnread: message.labelIds?.includes('UNREAD') ?? false,
  }
}
