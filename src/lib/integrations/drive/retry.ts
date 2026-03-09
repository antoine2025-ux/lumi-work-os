/**
 * Google Drive API retry utility with exponential backoff.
 *
 * Handles HTTP 429 (rate limit) and 5xx errors from the Drive API.
 * Drive API quota: 1000 requests / 100 seconds / user.
 */

import { logger } from '@/lib/logger'

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 1000

export class DriveRateLimitError extends Error {
  constructor(message = 'Google Drive API rate limit exceeded. Please try again later.') {
    super(message)
    this.name = 'DriveRateLimitError'
  }
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message
  // HTTP 429 (rate limit) or 5xx (server error)
  return (
    message.includes('429') ||
    message.includes('rateLimitExceeded') ||
    message.includes('userRateLimitExceeded') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('backendError')
  )
}

/**
 * Execute a Drive API call with exponential backoff for rate limit / server errors.
 * Retries up to MAX_RETRIES times before throwing.
 */
export async function withDriveRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err

      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        throw err
      }

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt)
      logger.warn(`Drive API ${operationName}: retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`, {
        error: err instanceof Error ? err.message : String(err),
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
