# Manual Testing Guide for Health Check

This guide provides step-by-step instructions to validate that the health check aligns with real app behavior.

## Prerequisites

1. **Development server running** (optional - health check works without it)
2. **Browser with DevTools** (Chrome/Firefox/Safari)
3. **Terminal access**

---

## Part 1: Terminal Testing

### Step 1: Run Health Check

```bash
cd /Users/tonyem/lumi-work-os
npm run health:check
```

**Expected Output:**
- ✅ Section headers: "Env & Secrets", "Database & Prisma", "API & Auth", "Loopbrain & Context Objects", "Multi-Tenant Isolation"
- ✅ PASS/WARN/FAIL status for each section
- ✅ Overall health score percentage
- ✅ Report file generated: `HEALTH_CHECK_REPORT.md`

**What to Verify:**
- Script runs without crashing
- All sections appear
- Clear indication of what needs fixing first (failed tests listed)
- Report file is created

### Step 2: Review Report File

```bash
cat HEALTH_CHECK_REPORT.md
```

**Expected Content:**
- Executive summary with counts
- Section-by-section breakdown
- Failed tests with explanations
- Warnings with details
- Recommendations

**What to Verify:**
- Report is readable and well-formatted
- Failed tests are clearly explained
- Recommendations are actionable

---

## Part 2: Browser Testing (Server Running)

### Step 1: Start Development Server

```bash
npm run dev
```

Wait for server to start (usually `http://localhost:3000`)

### Step 2: Test Spaces Endpoints

#### A. Projects API

1. **Open browser** → Navigate to `http://localhost:3000`
2. **Open DevTools** (F12) → Network tab
3. **If not logged in:**
   - Navigate to `/login` and log in
4. **Navigate to `/projects`** (or any projects page)
5. **Check Network tab:**
   - Look for `GET /api/projects` request
   - **Expected:** Status 200 (if logged in) or 401 (if not)
   - **Click on request** → Response tab
   - **Verify response structure:**
     ```json
     [
       {
         "id": "...",
         "name": "...",
         "workspaceId": "...",
         "status": "...",
         ...
       }
     ]
     ```
   - **Check for context fields:** `id`, `name`, `workspaceId` should be present

#### B. Tasks API

1. **Navigate to a project page** (e.g., `/projects/[id]`)
2. **Check Network tab:**
   - Look for `GET /api/tasks?projectId=...` request
   - **Expected:** Status 200 (if logged in) or 401 (if not)
   - **Verify response structure:**
     ```json
     [
       {
         "id": "...",
         "title": "...",
         "status": "...",
         "workspaceId": "...",
         ...
       }
     ]
     ```
   - **Check for context fields:** `id`, `title`, `status`, `workspaceId`

#### C. Wiki Pages API

1. **Navigate to `/wiki`** or any wiki page
2. **Check Network tab:**
   - Look for `GET /api/wiki/pages` request
   - **Expected:** Status 200 (if logged in) or 401 (if not)
   - **Verify response structure:**
     ```json
     {
       "data": [
         {
           "id": "...",
           "title": "...",
           "slug": "...",
           "workspaceId": "...",
           ...
         }
       ],
       "pagination": {...}
     }
     ```
   - **Check for context fields:** `id`, `title`, `slug`, `workspaceId`

### Step 3: Test Org Endpoints

#### A. Departments API

1. **Navigate to `/org`** or organization page (if exists)
2. **Check Network tab:**
   - Look for `GET /api/org/departments` request
   - **Expected:** Status 200 (if logged in) or 401/500 (if not)
   - **Verify response structure:**
     ```json
     [
       {
         "id": "...",
         "name": "...",
         "workspaceId": "...",
         ...
       }
     ]
     ```
   - **Check for context fields:** `id`, `name`, `workspaceId`

#### B. Teams API

1. **Same page** - Check for `GET /api/org/teams` request
2. **Expected:** Status 200 (if logged in) or 401/500 (if not)
3. **Verify context structure** similar to departments

### Step 4: Test Loopbrain Endpoints

#### A. Loopbrain Chat

1. **Navigate to any wiki page** (e.g., `/wiki/[slug]`)
2. **Open AI assistant panel** (look for AI button or sidebar)
3. **Type a query:** "What is this page about?"
4. **Send the query**
5. **Check Network tab:**
   - Look for `POST /api/loopbrain/chat` request
   - **Expected:** Status 200 (if logged in) or 401 (if not)
   - **Click on request** → Payload tab:
     ```json
     {
       "mode": "spaces",
       "query": "What is this page about?",
       "pageId": "...",
       ...
     }
     ```
   - **Response tab:**
     ```json
     {
       "mode": "spaces",
       "workspaceId": "...",
       "query": "...",
       "context": {
         "primaryContext": {...},
         "retrievedItems": [...]
       },
       "answer": "...",
       "suggestions": [...],
       ...
     }
     ```
   - **Verify context structure:**
     - `context` object exists
     - `retrievedItems` array has items with `id`, `type`, `title`
     - `answer` is a string
     - `suggestions` is an array

#### B. Loopbrain Context

1. **In same browser session**, check Network tab
2. **Look for `GET /api/loopbrain/context`** request
3. **Expected:** Status 200 (if logged in) or 401 (if not)
4. **Verify response structure** has context-like fields

#### C. Loopbrain Search

1. **Check Network tab** for `POST /api/loopbrain/search` requests
2. **Expected:** Status 200 (if logged in) or 401 (if not)
3. **Verify response structure:**
   ```json
   {
     "workspaceId": "...",
     "query": "...",
     "results": [
       {
         "contextItemId": "...",
         "type": "...",
         "title": "...",
         "score": 0.95,
         ...
       }
     ]
   }
   ```

### Step 5: Test Authentication Requirements

#### A. Test Without Authentication

1. **Open incognito/private window**
2. **Navigate directly to API endpoints:**

   ```bash
   # In terminal, test with curl:
   curl http://localhost:3000/api/projects
   curl http://localhost:3000/api/tasks?projectId=test
   curl http://localhost:3000/api/wiki/pages
   curl http://localhost:3000/api/org/departments
   ```

3. **Expected:** All should return `401 Unauthorized` or `403 Forbidden`

#### B. Test With Authentication

1. **In regular browser window** (logged in)
2. **Repeat the same requests** via browser DevTools
3. **Expected:** Should return `200 OK` with data

**What to Verify:**
- ✅ Protected endpoints require authentication
- ✅ Unauthenticated requests are rejected (401/403)
- ✅ Authenticated requests succeed (200)

---

## Part 3: Code Pattern Verification

### Step 1: Check Multi-Tenant Isolation

```bash
cd /Users/tonyem/lumi-work-os

# Find API routes that might not use workspaceId
grep -r "prisma\." src/app/api --include="*.ts" | grep -v "workspaceId" | head -20

# Find routes that might not have authentication
grep -r "export async function" src/app/api --include="*.ts" | grep -v "getUnifiedAuth\|assertAccess\|getServerSession" | head -20
```

**What to Verify:**
- Most routes use `workspaceId` in queries
- Most routes have authentication checks
- Routes without workspaceId are intentional (public endpoints)

### Step 2: Verify Context Structure Consistency

```bash
# Check Projects API response structure
grep -A 10 "return NextResponse.json" src/app/api/projects/route.ts | head -20

# Check Tasks API response structure  
grep -A 10 "return NextResponse.json" src/app/api/tasks/route.ts | head -20

# Check Wiki Pages API response structure
grep -A 10 "return NextResponse.json" src/app/api/wiki/pages/route.ts | head -20
```

**What to Verify:**
- Responses include `id` field
- Responses include `workspaceId` field
- Responses have consistent structure

---

## Part 4: Validation Checklist

### ✅ Health Check Script

- [ ] Script runs without errors
- [ ] All sections appear in output
- [ ] Section statuses are accurate (PASS/WARN/FAIL)
- [ ] Report file is generated
- [ ] Health score is calculated correctly

### ✅ API Endpoints

- [ ] Projects API requires authentication
- [ ] Tasks API requires authentication
- [ ] Wiki Pages API requires authentication
- [ ] Org endpoints require authentication
- [ ] Loopbrain endpoints require authentication
- [ ] Responses have consistent structure

### ✅ Context Objects

- [ ] Projects responses have `id`, `name`, `workspaceId`
- [ ] Tasks responses have `id`, `title`, `status`, `workspaceId`
- [ ] Wiki Pages responses have `id`, `title`, `slug`, `workspaceId`
- [ ] Loopbrain responses have `context` object with structured items
- [ ] Context items have `id`, `type`, `title` fields

### ✅ Multi-Tenant Isolation

- [ ] Most API routes use `workspaceId` (>80%)
- [ ] Most API routes require authentication (>80%)
- [ ] WorkspaceId is derived from auth context, not client input
- [ ] No hardcoded workspace IDs in queries

### ✅ Report Quality

- [ ] Report is readable and well-formatted
- [ ] Failed tests are clearly explained
- [ ] Warnings provide actionable guidance
- [ ] Recommendations are relevant
- [ ] Section breakdown is accurate

---

## Expected Results Summary

### When Everything Works:

- **Health Score:** 80-100%
- **Env & Secrets:** PASS (or WARN if optional vars missing)
- **Database & Prisma:** PASS
- **API & Auth:** PASS
- **Loopbrain & Context Objects:** PASS (or WARN if context structure inconsistent)
- **Multi-Tenant Isolation:** PASS (or WARN if coverage <80%)

### Common Issues:

1. **Missing Environment Variables**
   - **Symptom:** FAIL in "Env & Secrets" section
   - **Fix:** Copy `env.template` to `.env` and fill in values

2. **Server Not Running**
   - **Symptom:** API endpoints skipped
   - **Fix:** Run `npm run dev`

3. **Authentication Not Working**
   - **Symptom:** Endpoints return 500 instead of 401
   - **Fix:** Check NextAuth configuration

4. **Context Structure Inconsistent**
   - **Symptom:** WARN in "Loopbrain & Context Objects"
   - **Fix:** Standardize response structures across APIs

5. **Low Multi-Tenant Coverage**
   - **Symptom:** WARN in "Multi-Tenant Isolation"
   - **Fix:** Add workspaceId and auth to all API routes

---

## Quick Reference

### Run Health Check
```bash
npm run health:check
```

### View Report
```bash
cat HEALTH_CHECK_REPORT.md
```

### Test API Endpoint (curl)
```bash
# Without auth (should get 401)
curl http://localhost:3000/api/projects

# With auth (need to get session cookie first)
curl -H "Cookie: next-auth.session-token=..." http://localhost:3000/api/projects
```

### Check Code Patterns
```bash
# Find routes without workspaceId
grep -r "prisma\." src/app/api --include="*.ts" | grep -v "workspaceId"

# Find routes without auth
grep -r "export async function" src/app/api --include="*.ts" | grep -v "getUnifiedAuth\|assertAccess"
```

---

**Last Updated:** $(date)
**Related Files:**
- `health-check.js` - Main health check script
- `HEALTH_CHECK_REPORT.md` - Generated report
- `HEALTH_CHECK_ENHANCEMENTS.md` - Enhancement documentation



