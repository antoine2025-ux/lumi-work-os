/**
 * Request Context Helper
 * 
 * Provides utilities for building logging context from Next.js requests.
 * This module extracts requestId, workspaceId, userId, route, and method
 * from requests in a safe way that handles both authenticated and public routes.
 * 
 * This is the recommended way for API routes to seed their logging context.
 * It intentionally absorbs auth resolution errors and leaves fields undefined
 * in those cases (e.g., for public endpoints).
 */

import { NextRequest } from 'next/server'
import { getUnifiedAuth } from './unified-auth'
import { LogContext } from './logger'

/**
 * Build logging context from a Next.js request
 * 
 * Extracts:
 * - requestId from x-request-id header (set by middleware)
 * - workspaceId and userId from getUnifiedAuth (if authenticated)
 * - route and method from the request
 * 
 * This function is safe to call on public routes - it will not throw
 * if authentication fails, it will simply leave workspaceId and userId undefined.
 * 
 * @param request - Next.js request object
 * @returns LogContext with available fields populated
 */
export async function buildLogContextFromRequest(request: NextRequest): Promise<LogContext> {
  const requestId = request.headers.get('x-request-id') ?? undefined
  const url = request.nextUrl
  const route = url.pathname
  const method = request.method

  // Try to get auth context; handle unauthenticated cases without throwing
  let workspaceId: string | undefined
  let userId: string | undefined

  try {
    const auth = await getUnifiedAuth(request)
    workspaceId = auth?.workspaceId
    userId = auth?.user?.userId
  } catch {
    // Unauthenticated or public route; fine - leave fields undefined
  }

  return { 
    requestId, 
    workspaceId, 
    userId, 
    route, 
    method 
  }
}
