/**
 * Loopbrain Error System
 * 
 * Typed error handling for Loopbrain with consistent API payloads,
 * user-safe messages, and preserved internal logs.
 */

/**
 * Error codes for Loopbrain operations
 */
export type LoopbrainErrorCode =
  | 'AI_CONFIG_MISSING'
  | 'AI_RATE_LIMIT'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_MODEL_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_ERROR'
  | 'DB_ERROR'
  | 'AUTH_ERROR'
  | 'ACCESS_DENIED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN'

/**
 * Loopbrain Error class
 * 
 * Extends Error with structured error information:
 * - code: Machine-readable error code
 * - status: HTTP status code
 * - isUserSafe: Whether message is safe to show to users
 * - details: Additional context (never includes secrets)
 * - cause: Original error (for server logs)
 */
export class LoopbrainError extends Error {
  code: LoopbrainErrorCode
  status: number
  isUserSafe: boolean
  details?: Record<string, unknown>
  cause?: unknown

  constructor(
    code: LoopbrainErrorCode,
    status: number,
    message: string,
    options?: {
      isUserSafe?: boolean
      details?: Record<string, unknown>
      cause?: unknown
    }
  ) {
    super(message)
    this.name = 'LoopbrainError'
    this.code = code
    this.status = status
    this.isUserSafe = options?.isUserSafe ?? true
    this.details = options?.details
    this.cause = options?.cause

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LoopbrainError)
    }
  }
}

/**
 * User-friendly messages for each error code
 */
export function userMessageFor(code: LoopbrainErrorCode): string {
  switch (code) {
    case 'AI_CONFIG_MISSING':
      return 'AI is not configured. Please contact support.'
    case 'AI_RATE_LIMIT':
      return 'AI service is temporarily rate-limited. Please try again in a moment.'
    case 'AI_QUOTA_EXCEEDED':
      return 'AI service quota has been exceeded. Please contact support.'
    case 'AI_MODEL_UNAVAILABLE':
      return 'AI model is temporarily unavailable. Please try again later.'
    case 'AI_TIMEOUT':
      return 'AI request timed out. Please try again.'
    case 'AI_PROVIDER_ERROR':
      return 'AI service encountered an error. Please try again.'
    case 'DB_ERROR':
      return 'Database error occurred. Please try again.'
    case 'AUTH_ERROR':
      return 'Authentication error. Please sign in again.'
    case 'ACCESS_DENIED':
      return 'You do not have access to this resource.'
    case 'BAD_REQUEST':
      return 'Invalid request. Please check your input and try again.'
    case 'INTERNAL_ERROR':
      return 'An internal error occurred. Please try again or contact support.'
    case 'UNKNOWN':
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Convert any error to a LoopbrainError
 * 
 * Maps known error patterns to appropriate error codes.
 * Preserves original error as cause for server logs.
 * 
 * @param err - Any error (Error, string, unknown)
 * @returns Normalized LoopbrainError
 */
export function toLoopbrainError(err: unknown): LoopbrainError {
  // If already a LoopbrainError, return as-is
  if (err instanceof LoopbrainError) {
    return err
  }

  // Extract error message
  const errorMessage = err instanceof Error ? err.message : String(err)
  const errorName = err instanceof Error ? err.name : 'UnknownError'

  // Check for OpenAI/OpenAI API errors
  if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('API key')) {
    return new LoopbrainError(
      'AI_CONFIG_MISSING',
      503,
      userMessageFor('AI_CONFIG_MISSING'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for rate limit errors
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('rate_limit') ||
    errorMessage.includes('429') ||
    errorName === 'RateLimitError'
  ) {
    return new LoopbrainError(
      'AI_RATE_LIMIT',
      429,
      userMessageFor('AI_RATE_LIMIT'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for quota errors
  if (
    errorMessage.includes('quota') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('402')
  ) {
    return new LoopbrainError(
      'AI_QUOTA_EXCEEDED',
      429, // Use 429 for simplicity as specified
      userMessageFor('AI_QUOTA_EXCEEDED'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for model unavailable errors
  if (
    errorMessage.includes('model') && (
      errorMessage.includes('not found') ||
      errorMessage.includes('unavailable') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('404')
    )
  ) {
    return new LoopbrainError(
      'AI_MODEL_UNAVAILABLE',
      503,
      userMessageFor('AI_MODEL_UNAVAILABLE'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('504') ||
    errorName === 'TimeoutError' ||
    errorName === 'AbortError'
  ) {
    return new LoopbrainError(
      'AI_TIMEOUT',
      504,
      userMessageFor('AI_TIMEOUT'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for database errors
  if (
    errorMessage.includes('Prisma') ||
    errorMessage.includes('database') ||
    errorMessage.includes('connection') ||
    errorName === 'PrismaClientKnownRequestError' ||
    errorName === 'PrismaClientUnknownRequestError'
  ) {
    return new LoopbrainError(
      'DB_ERROR',
      500,
      userMessageFor('DB_ERROR'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for auth errors
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('401') ||
    errorName === 'UnauthorizedError'
  ) {
    return new LoopbrainError(
      'AUTH_ERROR',
      401,
      userMessageFor('AUTH_ERROR'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for access denied errors
  if (
    errorMessage.includes('forbidden') ||
    errorMessage.includes('access denied') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('403')
  ) {
    return new LoopbrainError(
      'ACCESS_DENIED',
      403,
      userMessageFor('ACCESS_DENIED'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for bad request errors
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('bad request') ||
    errorMessage.includes('400') ||
    errorName === 'ValidationError'
  ) {
    return new LoopbrainError(
      'BAD_REQUEST',
      400,
      userMessageFor('BAD_REQUEST'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for OpenAI/Anthropic/Google provider errors
  if (
    errorMessage.includes('OpenAI') ||
    errorMessage.includes('Anthropic') ||
    errorMessage.includes('Google') ||
    errorMessage.includes('API error')
  ) {
    return new LoopbrainError(
      'AI_PROVIDER_ERROR',
      502,
      userMessageFor('AI_PROVIDER_ERROR'),
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for common JavaScript errors that might not match other patterns
  if (errorName === 'TypeError' || errorName === 'ReferenceError' || errorName === 'SyntaxError') {
    // These are usually programming errors, but log them with more context
    return new LoopbrainError(
      'INTERNAL_ERROR',
      500,
      userMessageFor('INTERNAL_ERROR'),
      {
        isUserSafe: false, // Don't show internal errors to users
        details: {
          errorType: errorName,
          errorMessage: errorMessage.substring(0, 200) // Truncate long messages
        },
        cause: err
      }
    )
  }

  // Check for network/fetch errors
  if (
    errorName === 'TypeError' && (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND')
    )
  ) {
    return new LoopbrainError(
      'AI_PROVIDER_ERROR',
      502,
      'Network error connecting to AI service. Please check your connection and try again.',
      {
        isUserSafe: true,
        cause: err
      }
    )
  }

  // Check for JSON parsing errors
  if (errorName === 'SyntaxError' && errorMessage.includes('JSON')) {
    return new LoopbrainError(
      'INTERNAL_ERROR',
      500,
      userMessageFor('INTERNAL_ERROR'),
      {
        isUserSafe: false,
        details: {
          errorType: 'JSONParseError'
        },
        cause: err
      }
    )
  }

  // Fallback to unknown error - log with full details for debugging
  console.error('🔴 UNKNOWN Loopbrain Error - Full details:', {
    errorName,
    errorMessage,
    error: err instanceof Error ? {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err as unknown as Record<string, unknown>)
    } : String(err)
  })
  
  return new LoopbrainError(
    'UNKNOWN',
    500,
    userMessageFor('UNKNOWN'),
    {
      isUserSafe: true,
      details: {
        errorName,
        errorMessage: errorMessage.substring(0, 500), // Truncate for safety
        // Include error type for debugging
        errorType: err instanceof Error ? err.constructor.name : typeof err
      },
      cause: err
    }
  )
}

/**
 * Sanitize error details for client
 * 
 * Removes any potentially sensitive information from error details.
 * 
 * @param details - Error details object
 * @returns Sanitized details (no secrets)
 */
export function sanitizeErrorDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) {
    return undefined
  }

  const sanitized: Record<string, unknown> = {}
  const secretKeys = ['key', 'token', 'secret', 'password', 'apiKey', 'api_key', 'authorization', 'auth']

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase()
    if (secretKeys.some(secret => lowerKey.includes(secret))) {
      // Redact secret values
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
