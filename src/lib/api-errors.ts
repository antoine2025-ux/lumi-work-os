/**
 * Standardized API Error Handling
 * 
 * Provides consistent error responses across all API routes with:
 * - Typed error codes
 * - Consistent response format
 * - User-safe messages
 * - Request ID tracking
 * - Secret sanitization
 */

/**
 * API Error codes
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN'

/**
 * API Error class
 */
export class ApiError extends Error {
  code: ApiErrorCode
  status: number
  isUserSafe: boolean
  details?: Record<string, unknown>
  cause?: unknown
  requestId?: string

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    options?: {
      isUserSafe?: boolean
      details?: Record<string, unknown>
      cause?: unknown
      requestId?: string
    }
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.isUserSafe = options?.isUserSafe ?? true
    this.details = options?.details
    this.cause = options?.cause
    this.requestId = options?.requestId

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }
}

/**
 * User-friendly messages for each error code
 */
export function userMessageFor(code: ApiErrorCode): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Invalid request data. Please check your input and try again.'
    case 'AUTHENTICATION_REQUIRED':
      return 'You must be signed in to access this resource.'
    case 'AUTHORIZATION_DENIED':
      return 'You do not have permission to perform this action.'
    case 'NOT_FOUND':
      return 'The requested resource was not found.'
    case 'CONFLICT':
      return 'This action conflicts with existing data.'
    case 'RATE_LIMIT':
      return 'Too many requests. Please try again later.'
    case 'DATABASE_ERROR':
      return 'A database error occurred. Please try again.'
    case 'EXTERNAL_SERVICE_ERROR':
      return 'An external service error occurred. Please try again later.'
    case 'INTERNAL_ERROR':
      return 'An internal error occurred. Please try again or contact support.'
    case 'UNKNOWN':
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Convert any error to an ApiError
 */
export function toApiError(err: unknown, requestId?: string): ApiError {
  // If already an ApiError, return as-is (but update requestId if provided)
  if (err instanceof ApiError) {
    if (requestId) {
      err.requestId = requestId
    }
    return err
  }

  const errorMessage = err instanceof Error ? err.message : String(err)
  const errorName = err instanceof Error ? err.name : 'UnknownError'

  // Check for Zod validation errors
  if (errorName === 'ZodError' || errorMessage.includes('ZodError')) {
    return new ApiError(
      'VALIDATION_ERROR',
      400,
      userMessageFor('VALIDATION_ERROR'),
      {
        isUserSafe: true,
        details: err instanceof Error && (err as any).issues ? { issues: (err as any).issues } : undefined,
        cause: err,
        requestId,
      }
    )
  }

  // Check for Prisma errors
  if (errorMessage.includes('Prisma') || errorName.includes('Prisma')) {
    const prismaError = err as any
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return new ApiError(
        'CONFLICT',
        409,
        'A record with this information already exists.',
        {
          isUserSafe: true,
          details: prismaError.meta,
          cause: err,
          requestId,
        }
      )
    }

    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return new ApiError(
        'VALIDATION_ERROR',
        400,
        'Invalid reference. Please check that all referenced resources exist.',
        {
          isUserSafe: true,
          details: prismaError.meta,
          cause: err,
          requestId,
        }
      )
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return new ApiError(
        'NOT_FOUND',
        404,
        'The requested resource was not found.',
        {
          isUserSafe: true,
          cause: err,
          requestId,
        }
      )
    }

    // Generic database error
    return new ApiError(
      'DATABASE_ERROR',
      500,
      userMessageFor('DATABASE_ERROR'),
      {
        isUserSafe: true,
        cause: err,
        requestId,
      }
    )
  }

  // Check for authentication errors
  if (
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('No session') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('401')
  ) {
    return new ApiError(
      'AUTHENTICATION_REQUIRED',
      401,
      userMessageFor('AUTHENTICATION_REQUIRED'),
      {
        isUserSafe: true,
        cause: err,
        requestId,
      }
    )
  }

  // Check for authorization errors
  if (
    errorMessage.includes('Forbidden') ||
    errorMessage.includes('access denied') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('403')
  ) {
    return new ApiError(
      'AUTHORIZATION_DENIED',
      403,
      userMessageFor('AUTHORIZATION_DENIED'),
      {
        isUserSafe: true,
        cause: err,
        requestId,
      }
    )
  }

  // Check for not found errors
  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('404')
  ) {
    return new ApiError(
      'NOT_FOUND',
      404,
      userMessageFor('NOT_FOUND'),
      {
        isUserSafe: true,
        cause: err,
        requestId,
      }
    )
  }

  // Check for rate limit errors
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('429')
  ) {
    return new ApiError(
      'RATE_LIMIT',
      429,
      userMessageFor('RATE_LIMIT'),
      {
        isUserSafe: true,
        cause: err,
        requestId,
      }
    )
  }

  // Check for external service errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('timeout')
  ) {
    return new ApiError(
      'EXTERNAL_SERVICE_ERROR',
      502,
      userMessageFor('EXTERNAL_SERVICE_ERROR'),
      {
        isUserSafe: true,
        cause: err,
        requestId,
      }
    )
  }

  // Fallback to internal error
  return new ApiError(
    'INTERNAL_ERROR',
    500,
    userMessageFor('INTERNAL_ERROR'),
    {
      isUserSafe: false,
      details: {
        errorName,
        errorMessage: errorMessage.substring(0, 200),
      },
      cause: err,
      requestId,
    }
  )
}

/**
 * Sanitize error details for client responses
 */
export function sanitizeErrorDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) {
    return undefined
  }

  const sanitized: Record<string, unknown> = {}
  const secretKeys = ['key', 'token', 'secret', 'password', 'apiKey', 'api_key', 'authorization', 'auth', 'cookie']

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase()
    if (secretKeys.some(secret => lowerKey.includes(secret))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Format error response for API routes
 */
export function formatErrorResponse(error: ApiError, includeDetails: boolean = false) {
  const response: {
    error: {
      code: ApiErrorCode
      message: string
      requestId?: string
      details?: Record<string, unknown>
    }
  } = {
    error: {
      code: error.code,
      message: error.isUserSafe ? error.message : userMessageFor(error.code),
      ...(error.requestId && { requestId: error.requestId }),
    },
  }

  // Include details only if requested and error is user-safe
  if (includeDetails && error.isUserSafe && error.details) {
    response.error.details = sanitizeErrorDetails(error.details)
  }

  // In development, include more details
  if (process.env.NODE_ENV === 'development' && error.details) {
    response.error.details = sanitizeErrorDetails(error.details)
  }

  return response
}

/**
 * Helper to handle errors in API routes
 * 
 * Usage:
 * ```typescript
 * try {
 *   // ... route logic
 * } catch (error) {
 *   return handleApiError(error, request)
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  request?: { headers?: Headers | { get: (name: string) => string | null } }
): Response {
  const requestId = request?.headers?.get?.('x-request-id') || undefined
  const apiError = toApiError(error, requestId)
  const response = formatErrorResponse(apiError, process.env.NODE_ENV === 'development')

  // Log error with full details (server-side only)
  console.error('[API Error]', {
    code: apiError.code,
    status: apiError.status,
    message: apiError.message,
    requestId: apiError.requestId,
    cause: apiError.cause instanceof Error ? {
      name: apiError.cause.name,
      message: apiError.cause.message,
      stack: apiError.cause.stack,
    } : apiError.cause,
  })

  return Response.json(response, { status: apiError.status })
}
