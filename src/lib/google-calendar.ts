import { google, calendar_v3 } from 'googleapis'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { prismaUnscoped } from '@/lib/db'

/**
 * Result from getGoogleCalendarClient — either a working calendar client
 * or an error indicating the user needs to (re-)authenticate.
 */
export type CalendarClientResult =
  | { ok: true; calendar: calendar_v3.Calendar }
  | { ok: false; needsAuth: boolean; needsReAuth: boolean; error: string; status: number }

/**
 * Build a Google Calendar API client from the current NextAuth session.
 * Returns a discriminated result so callers can return appropriate JSON responses.
 */
export async function getGoogleCalendarClient(): Promise<CalendarClientResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return { ok: false, needsAuth: true, needsReAuth: false, error: 'Unauthorized', status: 401 }
  }

  if (!session.accessToken) {
    return {
      ok: false,
      needsAuth: true,
      needsReAuth: false,
      error: 'Google Calendar not connected',
      status: 403,
    }
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return {
      ok: false,
      needsAuth: false,
      needsReAuth: false,
      error: 'Google Calendar integration not configured',
      status: 503,
    }
  }

  const baseUrl = getOAuthRedirectBaseUrl()
  // Capture email now (narrowed to string by the session check above)
  const userEmail = session.user.email

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/callback/google`,
  )

  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  })

  // Handle token refresh — persist new tokens to DB so they survive the session
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) {
      prismaUnscoped.account.updateMany({
        where: { user: { email: userEmail }, provider: 'google' },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : undefined,
        },
      }).catch((err: unknown) => {
        console.error('[Calendar] Failed to persist refreshed token', err)
      })
    }
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  return { ok: true, calendar }
}

/**
 * Inspect a Google API error and return a structured object for the client.
 * - `invalid_grant` → user needs to re-authenticate (token revoked/expired)
 * - `insufficientPermissions` / 403 → user's token lacks required scope (needs re-auth with upgraded scope)
 * - Other errors are re-thrown.
 */
export function handleGoogleApiError(error: unknown): {
  needsAuth: boolean
  needsReAuth: boolean
  error: string
  code?: string
  status: number
} {
  if (error instanceof Error) {
    const message = error.message

    if (message.includes('invalid_grant')) {
      return { needsAuth: true, needsReAuth: false, error: 'Google Calendar token expired', status: 403 }
    }

    if (
      message.includes('insufficientPermissions') ||
      message.includes('Insufficient Permission') ||
      message.includes('forbidden')
    ) {
      return {
        needsAuth: false,
        needsReAuth: true,
        error: 'Calendar permissions need to be upgraded',
        code: 'INSUFFICIENT_SCOPE',
        status: 403,
      }
    }
  }

  // Check for GaxiosError with status code
  const gaxiosError = error as { code?: number; response?: { status?: number } }
  if (gaxiosError.code === 403 || gaxiosError.response?.status === 403) {
    return {
      needsAuth: false,
      needsReAuth: true,
      error: 'Calendar permissions need to be upgraded',
      code: 'INSUFFICIENT_SCOPE',
      status: 403,
    }
  }

  // Unknown error — rethrow
  throw error
}

/**
 * Get the base URL for the OAuth redirect, handling dev vs production.
 */
function getOAuthRedirectBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('localhost')) {
      return process.env.NEXTAUTH_URL
    }
    return 'http://localhost:3000'
  }

  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
