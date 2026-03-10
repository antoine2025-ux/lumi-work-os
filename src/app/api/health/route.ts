import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-errors'
import { rateLimitExceeded } from '@/lib/rate-limit-response'

export async function GET(request: NextRequest) {
  const limit = await rateLimit(request, { windowMs: 60 * 1000, max: 60, identifier: 'health' })
  if (!limit.success) return rateLimitExceeded(limit.resetAt)
  try {
    return NextResponse.json({
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'set' : 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
      }
    })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}