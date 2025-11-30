# Loopbrain Integration Test Guide

## Backend Test

### 1. Test `/api/loopbrain/chat` endpoint

**With authentication (using browser DevTools):**

1. Open browser DevTools → Network tab
2. Navigate to a wiki page (e.g., `/wiki/[slug]`)
3. Open the AI assistant panel
4. Send a query: "Summarize this page"
5. Check Network tab for `POST /api/loopbrain/chat`

**Expected request:**
```json
{
  "mode": "spaces",
  "query": "Summarize this page",
  "pageId": "page-id-here",
  "useSemanticSearch": true,
  "maxContextItems": 10
}
```

**Expected response:**
```json
{
  "mode": "spaces",
  "workspaceId": "workspace-id",
  "userId": "user-id",
  "query": "Summarize this page",
  "context": {
    "primaryContext": { ... },
    "retrievedItems": [ ... ]
  },
  "answer": "Based on the current context...",
  "suggestions": [
    { "label": "Create tasks from this answer", "action": "create_tasks_from_answer" },
    { "label": "Update project status", "action": "update_project_status" }
  ],
  "metadata": { ... }
}
```

### 2. Test error handling

**Test with invalid mode:**
```bash
curl -X POST http://localhost:3000/api/loopbrain/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"mode": "invalid", "query": "test"}'
```
**Expected:** `400` with `{"error": "Invalid mode..."}`

**Test with missing query:**
```bash
curl -X POST http://localhost:3000/api/loopbrain/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"mode": "spaces"}'
```
**Expected:** `400` with `{"error": "query is required..."}`

## Frontend Test

### 1. Test assistant panel opens

1. Navigate to `/wiki/[slug]` (any wiki page)
2. Click the floating AI button (bottom-right) or use sidebar toggle
3. **Expected:** Assistant panel opens

### 2. Test query submission

1. Type a query: "What is this page about?"
2. Press Enter or click Send
3. **Expected:**
   - Loading indicator appears
   - Request sent to `/api/loopbrain/chat` (check Network tab)
   - Answer appears as formatted markdown
   - Suggestions appear as buttons (if any)
   - Related items appear (if semantic search found any)

### 3. Test suggestions

1. After receiving a response, look for suggestion buttons below the answer
2. Click a suggestion button
3. **Expected:** Console log shows `"Loopbrain suggestion clicked"` with suggestion object

### 4. Test error handling

1. Temporarily break the API (or use invalid query)
2. **Expected:** User-friendly error message appears: "Loopbrain couldn't answer right now. Please try again."

### 5. Test with different page contexts

**On a wiki page:**
- `pageId` should be sent in request
- Context should include page information

**On a project page (future):**
- `projectId` should be sent in request
- Context should include project information

## Verification Checklist

- [ ] Backend responds with `LoopbrainResponse` structure
- [ ] Frontend renders answer as markdown
- [ ] Suggestions appear as clickable buttons
- [ ] Retrieved items appear in "Related items" section
- [ ] Error messages are user-friendly
- [ ] No `workspaceId` or `userId` sent from client
- [ ] Backend derives `workspaceId` from auth correctly
- [ ] Multi-tenant isolation works (can't access other workspace data)


