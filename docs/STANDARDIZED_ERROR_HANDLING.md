# Standardized Error Handling Guide

## Overview

All API routes should use the standardized error handling utility (`src/lib/api-errors.ts`) for consistent error responses.

## Usage

### Basic Usage

```typescript
import { handleApiError } from '@/lib/api-errors'

export async function POST(request: NextRequest) {
  try {
    // ... your route logic
    return NextResponse.json(data)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
```

### Manual Error Creation

For custom errors, use the `ApiError` class:

```typescript
import { ApiError } from '@/lib/api-errors'

throw new ApiError(
  'NOT_FOUND',
  404,
  'Project not found',
  {
    requestId: request.headers.get('x-request-id') || undefined,
    details: { projectId: 'xxx' }
  }
)
```

## Error Codes

- `VALIDATION_ERROR` (400) - Invalid request data
- `AUTHENTICATION_REQUIRED` (401) - User must sign in
- `AUTHORIZATION_DENIED` (403) - User lacks permission
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Action conflicts with existing data
- `RATE_LIMIT` (429) - Too many requests
- `DATABASE_ERROR` (500) - Database operation failed
- `EXTERNAL_SERVICE_ERROR` (502) - External service failed
- `INTERNAL_ERROR` (500) - Internal server error
- `UNKNOWN` (500) - Unexpected error

## Automatic Error Mapping

The `handleApiError` function automatically maps common errors:

- **Zod validation errors** → `VALIDATION_ERROR` (400)
- **Prisma P2002** (unique constraint) → `CONFLICT` (409)
- **Prisma P2003** (foreign key) → `VALIDATION_ERROR` (400)
- **Prisma P2025** (not found) → `NOT_FOUND` (404)
- **Other Prisma errors** → `DATABASE_ERROR` (500)
- **"Unauthorized" messages** → `AUTHENTICATION_REQUIRED` (401)
- **"Forbidden" messages** → `AUTHORIZATION_DENIED` (403)
- **"not found" messages** → `NOT_FOUND` (404)
- **Rate limit messages** → `RATE_LIMIT` (429)
- **Network/fetch errors** → `EXTERNAL_SERVICE_ERROR` (502)

## Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data. Please check your input and try again.",
    "requestId": "req_123",
    "details": {
      // Optional, only in development or if explicitly included
    }
  }
}
```

## Migration Guide

### Before (Manual Error Handling)

```typescript
catch (error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: 'Validation error',
      details: error.issues
    }, { status: 400 })
  }
  
  if ((error as any).code === 'P2002') {
    return NextResponse.json({ 
      error: 'Conflict',
      details: (error as any).meta
    }, { status: 409 })
  }
  
  return NextResponse.json({ 
    error: 'Internal error'
  }, { status: 500 })
}
```

### After (Standardized)

```typescript
catch (error: unknown) {
  return handleApiError(error, request)
}
```

## Benefits

1. **Consistency**: All API routes return errors in the same format
2. **Request ID tracking**: Automatically includes request ID for tracing
3. **User-safe messages**: Prevents leaking sensitive error details
4. **Automatic mapping**: Handles common error patterns automatically
5. **Secret sanitization**: Automatically redacts sensitive data in error details

## Examples

### Example 1: Validation Error

```typescript
import { z } from 'zod'
import { handleApiError } from '@/lib/api-errors'

const schema = z.object({ name: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body) // Throws ZodError if invalid
    // ... create resource
  } catch (error) {
    return handleApiError(error, request)
    // Returns: { error: { code: "VALIDATION_ERROR", message: "...", details: {...} } }
  }
}
```

### Example 2: Custom Error

```typescript
import { ApiError } from '@/lib/api-errors'

export async function GET(request: NextRequest) {
  const project = await prisma.project.findUnique({ where: { id } })
  
  if (!project) {
    throw new ApiError(
      'NOT_FOUND',
      404,
      'Project not found',
      { requestId: request.headers.get('x-request-id') || undefined }
    )
  }
  
  return NextResponse.json(project)
}
```

### Example 3: Prisma Error (Automatic)

```typescript
export async function POST(request: NextRequest) {
  try {
    await prisma.project.create({
      data: { name: 'Test', slug: 'test' } // If slug exists, P2002 error
    })
  } catch (error) {
    return handleApiError(error, request)
    // Automatically maps P2002 → CONFLICT (409)
  }
}
```

## Notes

- Error details are only included in development mode by default
- Secrets (keys, tokens, passwords) are automatically redacted
- Request ID is automatically extracted from `x-request-id` header
- All errors are logged server-side with full details
