import { NextResponse } from 'next/server'

export function rateLimitExceeded(resetAt: Date): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests', retryAfter: resetAt.toISOString() },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetAt.toISOString(),
      },
    }
  )
}
