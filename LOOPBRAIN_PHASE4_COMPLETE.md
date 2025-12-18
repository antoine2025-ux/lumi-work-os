# Loopbrain Phase 4: Error Normalization - Complete ✅

## Summary

Implemented comprehensive error handling across Loopbrain so internal logs preserve original causes, API returns consistent error payloads, UI shows actionable errors, and no secrets leak.

## Files Created

1. **`src/lib/loopbrain/errors.ts`**
   - `LoopbrainErrorCode` union type (11 error codes)
   - `LoopbrainError` class with code, status, isUserSafe, details, cause
   - `toLoopbrainError()` - Converts any error to LoopbrainError
   - `userMessageFor()` - Returns user-friendly messages for each code
   - `sanitizeErrorDetails()` - Removes secrets from error details

## Files Updated

1. **`src/lib/ai/providers.ts`**
   - Missing API key throws `LoopbrainError(AI_CONFIG_MISSING, 503)`
   - OpenAI errors mapped to appropriate codes:
     - Rate limit → `AI_RATE_LIMIT` (429)
     - Quota → `AI_QUOTA_EXCEEDED` (429)
     - Model not found → `AI_MODEL_UNAVAILABLE` (503)
     - Timeout → `AI_TIMEOUT` (504)
     - Fallback → `AI_PROVIDER_ERROR` (502)
   - Original error preserved as `cause` for server logs

2. **`src/lib/loopbrain/orchestrator.ts`**
   - Top-level `runLoopbrainQuery()` catches and normalizes errors once
   - Logs structured error with requestId, code, message, plus cause name/message/stack
   - Re-throws normalized `LoopbrainError` (no double wrapping)
   - Unsupported mode throws `LoopbrainError(BAD_REQUEST, 400)`

3. **`src/app/api/loopbrain/chat/route.ts`**
   - Wrapped handler in try/catch
   - Converts errors via `toLoopbrainError()`
   - Returns consistent `{ error: { code, message, requestId } }` format
   - Dev-only `?forceError=CODE` query param for testing
   - Ensures requestId is always present

4. **`src/app/api/loopbrain/search/route.ts`**
   - Same error handling pattern as chat route
   - Consistent error response format
   - requestId always present

5. **`src/app/api/loopbrain/context/route.ts`**
   - Same error handling pattern as chat route
   - Consistent error response format
   - requestId always present

6. **`src/lib/loopbrain/client.ts`**
   - Parses structured error response `{ error: { code, message, requestId } }`
   - Throws Error with `code` and `requestId` properties
   - Preserves error code and requestId for UI access

7. **`src/components/loopbrain/assistant-panel.tsx`**
   - Detects error messages (contains "Request ID:")
   - Shows error message in red/destructive color
   - Shows copyable Request ID below error
   - No stack traces shown to user

8. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 10: Error Handling & Normalization
   - Added `testErrorHandling()` function structure

## Error Codes

- `AI_CONFIG_MISSING` (503) - API key not configured
- `AI_RATE_LIMIT` (429) - Rate limited
- `AI_QUOTA_EXCEEDED` (429) - Quota exceeded
- `AI_MODEL_UNAVAILABLE` (503) - Model not found/unavailable
- `AI_TIMEOUT` (504) - Request timed out
- `AI_PROVIDER_ERROR` (502) - Generic provider error
- `DB_ERROR` (500) - Database error
- `AUTH_ERROR` (401) - Authentication error
- `ACCESS_DENIED` (403) - Access denied
- `BAD_REQUEST` (400) - Invalid request
- `UNKNOWN` (500) - Unknown error

## Implementation Details

### Error Normalization Flow

1. **Provider Level** (`providers.ts`):
   - Catches OpenAI/Anthropic/Google errors
   - Maps to appropriate `LoopbrainError` codes
   - Preserves original error as `cause`

2. **Orchestrator Level** (`orchestrator.ts`):
   - Catches all errors at top-level `runLoopbrainQuery()`
   - Normalizes via `toLoopbrainError()` (no double wrapping)
   - Logs structured error with cause preserved
   - Re-throws normalized error

3. **API Route Level** (`chat/route.ts`, `search/route.ts`, `context/route.ts`):
   - Catches errors from orchestrator
   - Converts to `LoopbrainError` if needed
   - Returns consistent `{ error: { code, message, requestId } }`
   - Sanitizes details (removes secrets)

4. **Client Level** (`client.ts`):
   - Parses error response
   - Throws Error with `code` and `requestId` properties
   - Preserves for UI access

5. **UI Level** (`assistant-panel.tsx`):
   - Shows user-friendly error message
   - Displays copyable Request ID
   - No stack traces

### Error Response Format

```json
{
  "error": {
    "code": "AI_CONFIG_MISSING",
    "message": "AI is not configured. Please contact support.",
    "requestId": "lb-1705312345678-abc123xyz"
  }
}
```

### Server Logs Format

```json
{
  "requestId": "lb-1705312345678-abc123xyz",
  "errorCode": "AI_CONFIG_MISSING",
  "errorMessage": "AI is not configured. Please contact support.",
  "errorStatus": 503,
  "causeName": "Error",
  "causeMessage": "OPENAI_API_KEY is not configured...",
  "causeStack": "Error: OPENAI_API_KEY...\n  at ..."
}
```

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test 1**: Remove OPENAI_API_KEY → ask question
   - Expected: See "AI is not configured..." + requestId in UI
   - Expected: API returns `{ error: { code: "AI_CONFIG_MISSING", message: "...", requestId: "..." } }`
   - Expected: Status code 503
4. ⏳ **Manual Test 2**: Force provider error (wrong model)
   - Expected: See "Model unavailable..." + requestId in UI
   - Expected: Server logs include underlying cause for debugging
5. ⏳ **Manual Test 3**: Copy Request ID from UI
   - Expected: Request ID is copyable and matches server logs

## Key Features

1. ✅ **Consistent API payloads** - All errors return `{ error: { code, message, requestId } }`
2. ✅ **User-safe messages** - No stack traces, no secrets, actionable messages
3. ✅ **Preserved causes** - Original errors preserved in `cause` for server logs
4. ✅ **Request ID tracking** - Every error includes requestId for debugging
5. ✅ **No secret leakage** - `sanitizeErrorDetails()` removes secrets from error details
6. ✅ **No double wrapping** - Errors normalized once at orchestrator level

## Example Error Scenarios

### Missing API Key

**UI Shows:**
```
AI is not configured. Please contact support.

Request ID: lb-1705312345678-abc123xyz
```

**API Returns:**
```json
{
  "error": {
    "code": "AI_CONFIG_MISSING",
    "message": "AI is not configured. Please contact support.",
    "requestId": "lb-1705312345678-abc123xyz"
  }
}
```

**Server Logs:**
```json
{
  "requestId": "lb-1705312345678-abc123xyz",
  "errorCode": "AI_CONFIG_MISSING",
  "errorStatus": 503,
  "causeMessage": "OPENAI_API_KEY is not configured..."
}
```

### Rate Limit

**UI Shows:**
```
AI service is temporarily rate-limited. Please try again in a moment.

Request ID: lb-1705312345678-abc123xyz
```

**API Returns:**
```json
{
  "error": {
    "code": "AI_RATE_LIMIT",
    "message": "AI service is temporarily rate-limited. Please try again in a moment.",
    "requestId": "lb-1705312345678-abc123xyz"
  }
}
```

## Next Steps

- Monitor error rates by code in production
- Add error analytics dashboard
- Consider retry logic for transient errors (rate limits, timeouts)

