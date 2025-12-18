/**
 * Request ID Helper
 * 
 * Standardizes requestId extraction and generation across Loopbrain.
 * Prefers existing requestId from orchestrator or headers, else generates new one.
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Get or generate a request ID
 * 
 * Priority:
 * 1. Existing requestId from headers (X-Request-ID or x-request-id)
 * 2. Existing requestId from query params (?requestId=...)
 * 3. Generate new UUID
 * 
 * @param request - Next.js request object
 * @param existingRequestId - Optional existing requestId (e.g., from orchestrator)
 * @returns Request ID string
 */
export function getRequestId(
  request?: NextRequest | Request,
  existingRequestId?: string
): string {
  // Priority 1: Use existing requestId if provided
  if (existingRequestId) {
    return existingRequestId
  }

  // Priority 2: Extract from request headers
  if (request) {
    const headerRequestId = 
      request.headers.get('X-Request-ID') || 
      request.headers.get('x-request-id') ||
      request.headers.get('X-Request-Id')
    
    if (headerRequestId) {
      return headerRequestId
    }

    // Priority 3: Extract from query params (if NextRequest)
    if (request instanceof NextRequest || 'url' in request) {
      try {
        const url = new URL(request.url)
        const queryRequestId = url.searchParams.get('requestId')
        if (queryRequestId) {
          return queryRequestId
        }
      } catch {
        // Ignore URL parsing errors
      }
    }
  }

  // Priority 4: Generate new UUID
  return randomUUID()
}

/**
 * Generate a stable request ID for a given context
 * 
 * Useful for operations that need consistent IDs across retries.
 * 
 * @param prefix - Optional prefix (e.g., 'index', 'reindex')
 * @param contextId - Optional context identifier (e.g., entityId, workspaceId)
 * @returns Request ID string
 */
export function generateRequestId(prefix?: string, contextId?: string): string {
  const uuid = randomUUID()
  if (prefix && contextId) {
    return `${prefix}-${contextId}-${uuid.substring(0, 8)}`
  } else if (prefix) {
    return `${prefix}-${uuid.substring(0, 8)}`
  }
  return uuid
}

