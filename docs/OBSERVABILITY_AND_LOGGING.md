# Observability and Logging

## Overview

This document describes the observability and logging foundation for Loopwell 2.0. The logging system provides structured logging with correlation IDs, workspace context, and user context to enable effective debugging and monitoring in production.

## Architecture

### Core Components

1. **Logger** (`src/lib/logger.ts`)
   - Structured logging with JSON output in production
   - Pretty-printed output in development
   - Support for multiple log levels: debug, info, warn, error
   - Context-aware logging with requestId, workspaceId, userId

2. **Request Context Helper** (`src/lib/request-context.ts`)
   - Extracts logging context from Next.js requests
   - Safely handles both authenticated and public routes
   - Builds LogContext with requestId, workspaceId, userId, route, method

3. **Middleware Integration** (`src/middleware.ts`)
   - Sets `x-request-id` header on all requests
   - Logs incoming requests and responses
   - Tracks response times

## Logger API

### Log Levels

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'
```

- **debug**: Detailed diagnostic information (development only)
- **info**: General informational messages
- **warn**: Warning messages for potentially harmful situations
- **error**: Error messages for failures

### LogContext Type

```typescript
export interface LogContext {
  requestId?: string      // Correlation ID from x-request-id header
  workspaceId?: string    // Workspace ID from auth context
  userId?: string         // User ID from auth context
  route?: string          // Request route/pathname
  method?: string         // HTTP method
  [key: string]: unknown  // Additional context fields
}
```

### Logger Methods

```typescript
import { logger } from '@/lib/logger'

// Info logging
logger.info('Message', context)

// Warning logging
logger.warn('Message', context, error?)

// Error logging
logger.error('Message', context, error?)

// Debug logging (development only)
logger.debug('Message', context)
```

### Example Usage

```typescript
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

export async function POST(request: NextRequest) {
  const baseContext = await buildLogContextFromRequest(request)
  
  logger.info('Incoming request /api/example', baseContext)
  
  try {
    // ... handler logic ...
    
    logger.info('Request completed', {
      ...baseContext,
      resultCount: 10,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error in /api/example', baseContext, error)
    throw error
  }
}
```

## Request Context Helper

### buildLogContextFromRequest

The `buildLogContextFromRequest` function is the recommended way for API routes to seed their logging context.

```typescript
import { buildLogContextFromRequest } from '@/lib/request-context'

const baseContext = await buildLogContextFromRequest(request)
// Returns: { requestId, workspaceId, userId, route, method }
```

**Features:**
- Extracts `requestId` from `x-request-id` header (set by middleware)
- Attempts to get `workspaceId` and `userId` from `getUnifiedAuth`
- Safely handles unauthenticated/public routes (leaves fields undefined)
- Never throws - always returns a valid LogContext

**When to use:**
- At the start of every API route handler
- Before any logging calls
- As the base context for all log entries in that handler

## Integration Points

### API Routes with Logging

The following routes have integrated structured logging:

1. **`/api/loopbrain/chat`**
   - Logs incoming requests
   - Logs completion with mode and query length
   - Logs slow requests (> 1000ms)
   - Logs errors with full context

2. **`/api/projects`** (GET and POST)
   - Logs incoming requests
   - Logs completion with project count
   - Logs cache hits/misses
   - Logs slow requests (> 500ms)
   - Logs errors with full context

3. **`/api/workspaces/[workspaceId]/invites`** (GET and POST)
   - Logs incoming requests
   - Logs completion with invite details
   - Logs slow requests (> 500ms)
   - Logs errors with full context

4. **`/api/invites/[token]/accept`** (POST)
   - Logs incoming requests
   - Logs completion with workspace and role
   - Logs errors with full context

### Loopbrain Orchestrator

The Loopbrain orchestrator (`src/lib/loopbrain/orchestrator.ts`) includes:

- Entry logging: When orchestrator starts
- Exit logging: When orchestrator completes (with execution time)
- Error logging: When orchestrator encounters errors
- Context: requestId, workspaceId, userId, mode, executionTimeMs

**Note**: The orchestrator receives `requestId` from the API route and includes it in all log entries for correlation.

## Slow Request Logging

Slow request detection is implemented in critical routes:

- **Loopbrain chat**: Warns if request takes > 1000ms
- **Projects API**: Warns if request takes > 500ms
- **Invites API**: Warns if request takes > 500ms

Slow requests are logged at the `warn` level with duration information:

```typescript
if (durationMs > 1000) {
  logger.warn('Slow request /api/loopbrain/chat', {
    ...baseContext,
    durationMs,
  })
}
```

## Log Output Format

### Development Mode

In development, logs are pretty-printed for readability:

```
ℹ️ [2024-01-15T10:30:45.123Z] INFO: Incoming request /api/loopbrain/chat
  Context: {
    requestId: 'abc123',
    workspaceId: 'workspace-1',
    userId: 'user-1',
    route: '/api/loopbrain/chat',
    method: 'POST'
  }
```

### Production Mode

In production, logs are output as JSON for easy parsing by log aggregation systems:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Incoming request /api/loopbrain/chat",
  "context": {
    "requestId": "abc123",
    "workspaceId": "workspace-1",
    "userId": "user-1",
    "route": "/api/loopbrain/chat",
    "method": "POST"
  }
}
```

## Best Practices

### 1. Always Use Request Context

```typescript
// ✅ Good
const baseContext = await buildLogContextFromRequest(request)
logger.info('Operation started', baseContext)

// ❌ Bad
logger.info('Operation started', {}) // Missing context
```

### 2. Don't Log Sensitive Data

```typescript
// ✅ Good - log metadata only
logger.info('Loopbrain chat completed', {
  ...baseContext,
  queryLength: query.length,
  mode: 'spaces',
})

// ❌ Bad - logs sensitive content
logger.info('Loopbrain chat completed', {
  ...baseContext,
  query: query, // Don't log full user queries
})
```

### 3. Include Duration for Performance Monitoring

```typescript
const startTime = Date.now()
// ... operation ...
const durationMs = Date.now() - startTime

logger.info('Operation completed', {
  ...baseContext,
  durationMs,
})
```

### 4. Use Appropriate Log Levels

- **debug**: Detailed diagnostic info (development only)
- **info**: Normal operations, successful completions
- **warn**: Slow requests, deprecation notices, recoverable errors
- **error**: Failures, exceptions, unrecoverable errors

### 5. Add Context to Errors

```typescript
try {
  // ... operation ...
} catch (error) {
  logger.error('Operation failed', {
    ...baseContext,
    operationType: 'create-project',
    durationMs: Date.now() - startTime,
  }, error)
  throw error
}
```

## Integration with External Logging Services

The current implementation uses `console.log` and `console.error` for output. To integrate with external logging services (Sentry, Datadog, etc.), you can:

### Option 1: Replace Console Output

Modify `src/lib/logger.ts` to send logs to your service:

```typescript
private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(error && { error: { name: error.name, message: error.message } })
  }

  // Send to external service
  if (this.isProduction) {
    datadogLogger.log(logEntry)
  } else {
    console.log(JSON.stringify(logEntry))
  }
}
```

### Option 2: Add Transport Layer

Create a transport interface and implement multiple transports:

```typescript
interface LogTransport {
  log(entry: LogEntry): void
}

class ConsoleTransport implements LogTransport { ... }
class DatadogTransport implements LogTransport { ... }
class SentryTransport implements LogTransport { ... }
```

### Option 3: Use Structured Logging Library

Consider migrating to a library like `pino` or `winston` that supports multiple transports out of the box.

## Viewing Logs

### Development

Logs appear in the terminal where you run `npm run dev` or `pnpm dev`.

### Production (Vercel)

1. **Vercel Dashboard**: Go to your project → Logs
2. **Vercel CLI**: `vercel logs [deployment-url]`
3. **Real-time**: `vercel logs --follow`

### Local Testing

```bash
# Run dev server and watch logs
pnpm dev

# Filter logs by level
pnpm dev | grep "ERROR"

# Filter logs by route
pnpm dev | grep "/api/loopbrain/chat"
```

## Correlation IDs

Every request gets a unique `requestId` that:

1. Is generated in middleware (`src/middleware.ts`)
2. Is set in the `x-request-id` header
3. Is included in all log entries for that request
4. Can be used to trace a request across multiple services/logs

**Example correlation:**
```
Request: POST /api/loopbrain/chat
  → requestId: abc123
  → Logs: [orchestrator started, context loaded, LLM called, orchestrator completed]
  → All logs include requestId: abc123
```

## Future Enhancements

1. **Health Check Endpoint**: `/api/health` that checks DB connectivity
2. **Metrics Collection**: Track request counts, error rates, p95/p99 latencies
3. **Distributed Tracing**: Add trace IDs for multi-service requests
4. **Log Sampling**: Sample debug logs in production to reduce volume
5. **Alert Integration**: Hook into PagerDuty, Slack, etc. for critical errors

## Related Documentation

- `docs/MULTI_TENANT_HARDENING.md` - Security and multi-tenancy
- `docs/WORKSPACE_SLUGS_AND_MIDDLEWARE.md` - Middleware details
- `ARCHITECTURE_SUMMARY.md` - Overall architecture
