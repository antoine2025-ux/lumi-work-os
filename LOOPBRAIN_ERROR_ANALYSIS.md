# Loopbrain Error Analysis

## Issue Summary

Loopbrain is failing with a 500 Internal Server Error, resulting in the user-facing message: "AI service temporarily unavailable" or "Loopbrain couldn't answer right now. Please try again."

## Error Flow

1. **Client** (`src/lib/loopbrain/client.ts:149-155`)
   - Makes POST request to `/api/loopbrain/chat`
   - Receives 500 error response
   - Logs error with empty object `{}` (line 149)
   - Throws user-friendly error message

2. **API Route** (`src/app/api/loopbrain/chat/route.ts:131-164`)
   - Calls `runLoopbrainQuery(loopbrainRequest)`
   - Catches errors and checks for "LLM call failed" message
   - Returns 500 with "AI service temporarily unavailable" if LLM fails

3. **Orchestrator** (`src/lib/loopbrain/orchestrator.ts:1678-1705`)
   - Calls `callLoopbrainLLM(prompt)` 
   - Which calls `generateAIResponse(prompt, model, options)`
   - Catches errors and wraps with "LLM call failed" message
   - Logs error but doesn't preserve original error details

4. **AI Provider** (`src/lib/ai/providers.ts:72-129`)
   - OpenAI provider checks for `OPENAI_API_KEY`
   - If missing, returns non-error response (line 75-78) - **This is problematic**
   - If API call fails, throws error with "OpenAI API error: ..." message

## Root Cause Analysis

### Most Likely Causes (in order of probability):

1. **Missing or Invalid OPENAI_API_KEY**
   - The provider checks for the key but returns a non-error response instead of throwing
   - This could cause unexpected behavior downstream

2. **OpenAI API Issues**
   - Rate limiting / quota exceeded
   - Invalid API key permissions
   - Network connectivity issues
   - Model availability issues (`gpt-4-turbo` might not be available)

3. **Error Information Loss**
   - Errors are wrapped multiple times, losing original context
   - Client-side error logging shows empty object `{}`
   - Server-side logs may have details but aren't visible to user

4. **Model Configuration**
   - Default model is `gpt-4-turbo` (line 38 in orchestrator.ts)
   - Model name might need to be `gpt-4-turbo-preview` or `gpt-4-1106-preview`
   - Or model might not be available in the API key's region/plan

## Issues Found

### 1. Error Handling Chain Loses Context

**Problem**: Errors are wrapped multiple times, losing the original error message:
- OpenAI throws: `"OpenAI API error: Rate limit exceeded"`
- Orchestrator wraps: `"LLM call failed: OpenAI API error: Rate limit exceeded"`
- API route checks for "LLM call failed" and returns generic: `"AI service temporarily unavailable"`
- Client receives generic message, original error is lost

**Location**: 
- `src/lib/loopbrain/orchestrator.ts:1702`
- `src/app/api/loopbrain/chat/route.ts:158-162`
- `src/lib/loopbrain/client.ts:149`

### 2. Missing API Key Returns Non-Error Response

**Problem**: When `OPENAI_API_KEY` is missing, the OpenAI provider returns a non-error response object instead of throwing an error. This could cause unexpected behavior.

**Location**: `src/lib/ai/providers.ts:74-78`

```typescript
if (!process.env.OPENAI_API_KEY) {
  return {
    content: 'AI features are disabled. Please configure OPENAI_API_KEY environment variable.',
    tokens: 0
  }
}
```

This response will be treated as a successful response by the orchestrator, but the content suggests an error condition.

### 3. Client-Side Error Logging Shows Empty Object

**Problem**: The client logs `console.error('Loopbrain API error:', {...})` but the object appears empty in the console. This suggests the error data isn't being properly serialized.

**Location**: `src/lib/loopbrain/client.ts:149-153`

### 4. Generic Error Messages Hide Root Cause

**Problem**: Users see generic messages like "AI service temporarily unavailable" without knowing the actual issue (missing API key, rate limit, network error, etc.).

## Recommended Fixes

### Priority 1: Improve Error Handling and Logging

1. **Preserve Original Error Messages**
   - Don't wrap errors multiple times
   - Pass original error messages through the chain
   - Include error details in API responses (for development)

2. **Fix Missing API Key Handling**
   - Throw an error instead of returning a non-error response
   - Or handle it explicitly in the orchestrator

3. **Improve Client-Side Error Logging**
   - Ensure error objects are properly serialized
   - Include response status and error details

4. **Add Better Error Messages**
   - Distinguish between different error types:
     - Missing API key
     - Rate limiting
     - Network errors
     - Invalid model
     - Other API errors

### Priority 2: Add Diagnostic Information

1. **Environment Variable Validation**
   - Check for `OPENAI_API_KEY` at startup
   - Validate API key format
   - Test API key connectivity

2. **Model Validation**
   - Verify model name is valid
   - Check model availability
   - Provide fallback models

3. **Better Logging**
   - Log full error stack traces in development
   - Include request context (workspaceId, userId, query)
   - Log API response details when available

### Priority 3: User Experience Improvements

1. **More Specific Error Messages**
   - "OpenAI API key is missing" vs "AI service unavailable"
   - "Rate limit exceeded, please try again in a moment"
   - "Network error, please check your connection"

2. **Retry Logic**
   - Automatic retry for transient errors
   - Exponential backoff for rate limits

3. **Error Recovery**
   - Fallback to alternative models
   - Graceful degradation when AI is unavailable

## Immediate Action Items

1. **Check Environment Variables**
   ```bash
   echo $OPENAI_API_KEY
   # Should show a valid API key starting with sk-
   ```

2. **Check Server Logs**
   - Look for "LLM call failed" errors
   - Check for OpenAI API error details
   - Verify model name and API key status

3. **Test API Key**
   - Verify the API key is valid and has credits
   - Check if the model `gpt-4-turbo` is available for your API key

4. **Verify Model Name**
   - Current default: `gpt-4-turbo`
   - Might need: `gpt-4-turbo-preview` or `gpt-4-1106-preview`
   - Or use: `gpt-3.5-turbo` as fallback

## Next Steps

1. Review server logs to identify the exact error
2. Verify environment variables are set correctly
3. Test OpenAI API key directly
4. Implement improved error handling (see fixes above)
5. Add better error messages and diagnostics

