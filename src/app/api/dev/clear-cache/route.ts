import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { clearAuthCache } from '@/lib/auth-cache'

/**
 * Dev-only endpoint to clear all caches
 * Only works in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Cache clearing is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const results: Record<string, string> = {}

    // 1. Clear Redis/memory cache
    try {
      await cache.flushAll()
      results.serverCache = 'cleared'
    } catch (error) {
      results.serverCache = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }

    // 2. Clear auth cache
    try {
      clearAuthCache()
      results.authCache = 'cleared'
    } catch (error) {
      results.authCache = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }

    // 3. Clear all cache patterns
    try {
      await cache.invalidatePattern('*')
      results.patternCache = 'cleared'
    } catch (error) {
      results.patternCache = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }

    return NextResponse.json({
      success: true,
      message: 'All server-side caches cleared',
      results
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to clear caches',
        message: error instanceof Error ? error.message : 'unknown error'
      },
      { status: 500 }
    )
  }
}

