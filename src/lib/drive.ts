/**
 * Google Drive API client helpers.
 * Uses Integration model (workspace-scoped) with per-user tokens in config.
 * Mirrors the Gmail OAuth pattern in src/lib/gmail.ts.
 */

import { google, drive_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
] as const

export interface DriveTokens {
  accessToken: string
  refreshToken?: string | null
}

export interface DriveIntegrationConfig {
  users?: Record<string, { accessToken: string; refreshToken?: string | null }>
}

export function getDriveOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.DRIVE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/drive/callback`

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google Drive OAuth not configured: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required',
    )
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getDriveApiClient(auth: OAuth2Client): drive_v3.Drive {
  return google.drive({ version: 'v3', auth })
}
