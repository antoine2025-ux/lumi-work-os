# **Loopwell Security Testing Guide**

**For: Anatoliy**  
 **Created: February 26, 2026**  
 **Purpose: Cursor-powered security testing workflow**

---

## **How to Use This Guide**

This file serves two purposes:

1. **Cursor Context**: Add this file to your Cursor workspace. Cursor will reference it automatically when you mention it in prompts.  
2. **Workflow Reference**: Each phase below contains copy-paste-ready Cursor prompts. Follow them sequentially.

### **Recommended Setup**

```shell
# Create your security testing branch
git checkout -b security/testing-phase1

# Create testing infrastructure
mkdir -p security-tests/{phase1,phase2,phase3,phase4,reports,scripts}
cd security-tests
```

Add this file to your Cursor workspace: `File → Add Folder to Workspace` → select the security-tests directory.

---

## **Part 1: Loopwell Architecture Context**

This section provides Cursor with the knowledge it needs about Loopwell's architecture. Keep this file open in your workspace so Cursor can reference it.

### **Tech Stack Overview**

```
Frontend: Next.js 15 (App Router), React 19, TypeScript (strict mode)
Backend: Next.js API routes (439 total), server components
Database: PostgreSQL on Supabase, Prisma ORM
Auth: NextAuth.js 4 with JWT sessions
AI: OpenAI API, pgvector for embeddings
Real-time: Socket.io (being implemented)
Hosting: Vercel (frontend), Supabase (database)
```

### **Authentication Architecture**

**Every authenticated route should follow this pattern:**

```ts
// 1. Verify identity
const { user, workspaceId } = await getUnifiedAuth(request);

// 2. Check role-based access
assertAccess({ user, workspaceId, requireRole: ['MEMBER'] });

// 3. Scope database queries to workspace
setWorkspaceContext(workspaceId);

// 4. Validate input
const data = SomeSchema.parse(await request.json());

// 5. Execute query (auto-scoped)
const result = await prisma.someModel.findMany({ ... });
```

**Key files:**

* `src/lib/unified-auth.ts` \- Single auth entry point  
* `src/lib/auth/assertAccess.ts` \- RBAC enforcement  
* `src/lib/prisma/scopingMiddleware.ts` \- Workspace isolation (122 models)

**Role hierarchy:** `VIEWER < MEMBER < ADMIN < OWNER`

### **Multi-Tenant Workspace Isolation**

**CRITICAL SECURITY BOUNDARY**: Every user belongs to a workspace. All data must be workspace-scoped.

The `scopingMiddleware.ts` file contains a `WORKSPACE_SCOPED_MODELS` array with 122 models. If a model is missing from this array, workspace isolation may fail.

**Your \#1 priority**: Verify that Workspace A cannot access Workspace B's data.

### **Route Categories**

| Category | Count | Expected Auth | Your Test Focus |
| ----- | ----- | ----- | ----- |
| Fully authenticated | \~290 | getUnifiedAuth \+ assertAccess | RBAC escalation |
| Partial auth | \~36 | getUnifiedAuth only | Role bypass |
| Public by design | \~65 | None | Data leakage |
| Dev/test (env-gated) | \~30 | NODE\_ENV check | Production reachability |
| Cron/internal | \~5 | Bearer token/secret | Secret enforcement |

### **Known High-Risk Areas**

**Recently fixed (verify independently):**

* SQL injection via `$queryRawUnsafe` (13 call sites \- all claimed parameterized)  
* 43 models added to workspace scoping (79 → 122 total)  
* 20 org routes missing auth (claimed fixed)  
* Slack webhook signature verification (claimed fixed)

**Known open issues:**

* `POST /api/migrations/blog` \- NO authentication (P0)  
* `orgId` fallback pattern in \~69 files (potential bypass vector)  
* Docker exec fallback in `src/lib/simple-auth.ts` (\~lines 98-128) \- dev-only but incomplete escaping

### **Critical Models for Isolation Testing**

```
WikiPage, Project, Task, Todo, OrgDepartment, OrgTeam, Person (OrgPosition),
OrgInvitation, Goal, PerformanceReview, ChatSession, LeaveRequest, 
PersonAvailability, DecisionDomain, CapacityContract
```

---

## **Part 2: Phase 1 Workflows (Weeks 1-2)**

**Goal**: Auth bypass testing, route mapping, SQL injection verification  
 **Deliverable**: Phase 1 Security Report

### **Phase 1, Task 1: Attack Surface Mapping**

#### **Step 1.1: Generate Route Analysis Script**

**Model recommendation**: Composer 1.5

**Cursor Prompt** (copy this into Cursor Composer):

```
Create a comprehensive Node.js script that analyzes all Loopwell API routes for authentication patterns.

Requirements:
1. Scan all files matching src/app/api/**/route.ts
2. For each route file, detect:
   - HTTP methods exported (GET, POST, PUT, DELETE, PATCH)
   - Presence of getUnifiedAuth() call
   - Presence of assertAccess() call
   - Presence of setWorkspaceContext() call
   - Any comments indicating intentional public access
3. Output a CSV with columns: Route Path, Methods, Has Auth, Has RBAC, Has Scoping, Category, Notes
4. Categorize each route as: AUTHENTICATED, PARTIAL_AUTH, PUBLIC_DESIGN, DEV_GATED, CRON_PROTECTED, UNKNOWN
5. Flag routes that have auth but missing RBAC or scoping
6. Include summary statistics at the end

Save to: security-tests/phase1/route-analyzer.js

Use fs.promises for file operations and include proper error handling.
```

**Expected output**: A script file at `security-tests/phase1/route-analyzer.js`

**Run it**:

```shell
node security-tests/phase1/route-analyzer.js > security-tests/reports/route-analysis.csv
```

**Verification**:

* CSV should have \~439 rows (one per route)  
* Check a few routes manually to verify accuracy  
* Summary stats should match the architecture context (\~290 authenticated, \~36 partial, etc.)

---

#### **Step 1.2: Generate Unauthenticated Access Test Suite**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Using the route-analysis.csv file, create a test suite that verifies public routes don't leak workspace data.

Requirements:
1. Read the CSV and filter for routes categorized as PUBLIC_DESIGN
2. For each public route, generate a curl command that:
   - Sends a request with NO authentication headers
   - Checks the response status code
   - Checks the response body for workspace-specific data leakage (workspaceId, projectId, userId patterns)
3. Create both:
   - A bash script (test-public-routes.sh) with all curl commands
   - A Node.js script (test-public-routes.js) that runs tests programmatically and outputs JSON results
4. JSON output format:
   {
     "route": "/api/health",
     "method": "GET",
     "statusCode": 200,
     "leaksData": false,
     "findings": []
   }

Save to: security-tests/phase1/test-public-routes.js and test-public-routes.sh

The Node script should accept a --base-url argument (default: http://localhost:3000)
```

**Run it**:

```shell
# Make sure dev server is running: npm run dev
chmod +x security-tests/phase1/test-public-routes.sh
node security-tests/phase1/test-public-routes.js --base-url http://localhost:3000 > security-tests/reports/public-routes-test.json
```

**Verification**:

* All routes should return expected status codes (200, 404, or 401/403)  
* No workspace UUIDs should appear in public route responses  
* Flag any route that returns 200 with data containing "workspaceId", "userId", "projectId"

---

### **Phase 1, Task 2: Authentication Bypass Testing**

#### **Step 2.1: JWT Manipulation Test Generator**

**Model recommendation**: Sonnet 3.5 (more complex security logic)

**Cursor Prompt**:

```
Create a JWT manipulation testing toolkit for Loopwell.

Requirements:
1. Create a Node.js script that:
   - Accepts a valid JWT token as input (from browser cookies)
   - Decodes and displays the payload
   - Generates multiple attack variants:
     a) Token with modified user ID
     b) Token with modified workspace ID
     c) Token with modified role (VIEWER → OWNER)
     d) Token with extended expiry
     e) Token signed with wrong secret
     f) Token with no signature
2. For each variant, test against a target route (configurable)
3. Output results showing which manipulations were accepted/rejected
4. Include timing information to detect timing attacks

Save to: security-tests/phase1/jwt-manipulation-tester.js

Dependencies: Use 'jsonwebtoken' package for JWT operations

JSON output format:
{
  "original": { "userId": "...", "workspaceId": "...", "role": "..." },
  "tests": [
    {
      "variant": "modified_userId",
      "accepted": false,
      "statusCode": 401,
      "responseTime": 45
    }
  ]
}
```

**Setup**:

```shell
cd security-tests/phase1
npm init -y
npm install jsonwebtoken
```

**Run it**:

```shell
# First, get a valid token from browser:
# 1. Open http://localhost:3000 and log in
# 2. Open DevTools > Application > Cookies
# 3. Copy the value of 'next-auth.session-token'

node security-tests/phase1/jwt-manipulation-tester.js \
  --token "YOUR_TOKEN_HERE" \
  --test-route "/api/wiki/pages" \
  > security-tests/reports/jwt-manipulation.json
```

**Expected results**: All manipulation attempts should be rejected (401/403)

**🚨 FINDING IF**: Any modified token returns 200 with data

---

#### **Step 2.2: Cross-Workspace Access Test**

**Model recommendation**: Composer 1.5

**Prerequisites**: You need two test workspaces with known IDs. Ask Tony to create these or use the onboarding flow twice with different emails.

**Cursor Prompt**:

```
Create a cross-workspace isolation testing script.

Requirements:
1. Accept two workspace session tokens as input (Workspace A and Workspace B)
2. Accept a list of API endpoints to test
3. For each endpoint:
   - Make a request as Workspace A user
   - Capture a record ID from the response (e.g., a wiki page ID, project ID)
   - Attempt to access that specific ID using Workspace B credentials
   - Record whether Workspace B received the data, got 404, or got 403
4. Test both list endpoints (GET /api/wiki/pages) and detail endpoints (GET /api/wiki/pages/:id)
5. Output detailed results with severity classification:
   - CRITICAL: Workspace B received Workspace A's data (200 response)
   - PASS: Workspace B got 404 or 403
   - WARNING: Workspace B got 500 or other unexpected response

Save to: security-tests/phase1/cross-workspace-tester.js

Output format:
{
  "endpoint": "/api/wiki/pages",
  "workspaceA_recordId": "uuid-123",
  "workspaceB_access": "denied",
  "statusCode": 404,
  "severity": "PASS",
  "evidence": "..."
}
```

**Run it**:

```shell
# Get tokens for both workspaces (from browser cookies after logging into each)
node security-tests/phase1/cross-workspace-tester.js \
  --workspace-a-token "TOKEN_A" \
  --workspace-b-token "TOKEN_B" \
  --endpoints "/api/wiki/pages,/api/projects,/api/org/people,/api/tasks" \
  > security-tests/reports/workspace-isolation.json
```

**🚨 CRITICAL FINDING IF**: Any endpoint returns Workspace A's data to Workspace B

---

### **Phase 1, Task 3: RBAC Escalation Testing**

#### **Step 3.1: Role Permission Matrix Generator**

**Model recommendation**: Composer 1.5

**Prerequisites**: Ask Tony to create test accounts at each role level (VIEWER, MEMBER, ADMIN, OWNER) in a test workspace.

**Cursor Prompt**:

```
Create an RBAC permission testing suite based on Loopwell's role hierarchy.

Requirements:
1. Define the permission matrix from CLAUDE.md:
   - VIEWER: Can view content, cannot create/edit
   - MEMBER: Can create/edit projects, wiki, tasks
   - ADMIN: Can manage org structure, invite members
   - OWNER: Can delete workspace, manage roles
2. Accept 4 session tokens as input (one per role)
3. Test a comprehensive set of operations for each role:
   - GET /api/wiki/pages (all roles should succeed)
   - POST /api/wiki/pages (MEMBER+ should succeed, VIEWER should fail)
   - POST /api/projects (MEMBER+ should succeed)
   - POST /api/org/people (ADMIN+ should succeed)
   - POST /api/org/invitations/create (ADMIN+ should succeed)
   - DELETE /api/workspace (OWNER only should succeed)
   - POST /api/org/structure/departments (ADMIN+ should succeed)
4. For each test, record:
   - Expected outcome (allow/deny)
   - Actual outcome
   - Whether it matches expectation
   - If mismatch: severity (CRITICAL if lower role can perform higher role action)

Save to: security-tests/phase1/rbac-tester.js

Output JSON with summary:
{
  "totalTests": 24,
  "passed": 23,
  "failed": 1,
  "critical": 0,
  "findings": [...]
}
```

**Run it**:

```shell
node security-tests/phase1/rbac-tester.js \
  --viewer-token "..." \
  --member-token "..." \
  --admin-token "..." \
  --owner-token "..." \
  > security-tests/reports/rbac-test.json
```

**Expected**: All tests should pass (actual \= expected)

**🚨 CRITICAL FINDING IF**: A VIEWER can create content or a MEMBER can delete the workspace

---

### **Phase 1, Task 4: SQL Injection Verification**

#### **Step 4.1: Raw SQL Call Site Analyzer**

**Model recommendation**: Sonnet 3.5 (security-focused code analysis)

**Cursor Prompt**:

```
Create a static analysis tool to detect SQL injection vulnerabilities in Loopwell's codebase.

Requirements:
1. Search all TypeScript files for these patterns:
   - $queryRawUnsafe
   - $executeRawUnsafe
   - $queryRaw
   - $executeRaw
2. For each occurrence:
   - Extract the surrounding code context (20 lines before/after)
   - Analyze the query construction:
     a) Check if it uses template literals with ${variables}
     b) Check if it uses proper parameterization ($1, $2, $3)
     c) Check if it uses Prisma tagged templates
   - Classify as: SAFE, UNSAFE, NEEDS_REVIEW
   - Extract any variables being interpolated
3. Generate a detailed report with:
   - File path and line number
   - Code snippet
   - Classification and reasoning
   - If UNSAFE: show the attack vector

Save to: security-tests/phase1/sql-injection-analyzer.js

Output format:
{
  "totalSites": 13,
  "safe": 11,
  "unsafe": 2,
  "needsReview": 0,
  "findings": [
    {
      "file": "src/lib/simple-auth.ts",
      "line": 260,
      "pattern": "$queryRawUnsafe",
      "classification": "SAFE",
      "reasoning": "Uses positional parameters $1, $2, $3",
      "code": "..."
    }
  ]
}
```

**Run it**:

```shell
node security-tests/phase1/sql-injection-analyzer.js > security-tests/reports/sql-analysis.json
```

**Manual verification**: For each site marked SAFE, review the code manually to confirm.

---

#### **Step 4.2: SQL Injection Payload Tester**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create an automated SQL injection testing suite for Loopwell API endpoints.

Requirements:
1. Define a comprehensive set of SQL injection payloads:
   - Classic: ' OR 1=1 --
   - Union-based: ' UNION SELECT null, email, password FROM users --
   - Time-based blind: '; SELECT pg_sleep(5); --
   - Stacked queries: '; DROP TABLE users; --
   - Encoded variants: %27%20OR%201%3D1%20--
2. Accept a list of endpoints that take user input (search, filters, etc.)
3. For each endpoint and each payload:
   - Send the payload in query parameters
   - Send the payload in POST body fields
   - Measure response time (detect time-based injection)
   - Check for SQL error messages in response
   - Check if response contains unexpected data (union injection success)
4. Output findings with severity:
   - CRITICAL: Injection succeeded (data leaked or query executed)
   - HIGH: SQL error messages visible
   - MEDIUM: Unusual response time (possible blind injection)
   - PASS: Payload rejected or no effect

Save to: security-tests/phase1/sql-injection-tester.js

Include a --dry-run flag that shows what would be tested without executing.
```

**Run it**:

```shell
# First, dry run to review what will be tested
node security-tests/phase1/sql-injection-tester.js \
  --dry-run \
  --endpoints "/api/org/people,/api/wiki/search,/api/projects" \
  --session-token "YOUR_TOKEN"

# Then run actual tests
node security-tests/phase1/sql-injection-tester.js \
  --endpoints "/api/org/people,/api/wiki/search,/api/projects" \
  --session-token "YOUR_TOKEN" \
  > security-tests/reports/sql-injection-test.json
```

**🚨 CRITICAL FINDING IF**: Any injection payload returns data or executes successfully

---

#### **Step 4.3: Verify Known Vulnerable Route**

**Model recommendation**: Cursor Chat (quick verification)

**Known issue**: `POST /api/migrations/blog` has NO authentication and executes raw DDL.

**Cursor Prompt** (in Chat):

```
Help me verify the security status of POST /api/migrations/blog.

1. Show me the route file contents
2. Confirm if there's ANY authentication check
3. Create a curl command to test if I can execute the endpoint without credentials
4. Analyze the risk: what could an attacker do with this endpoint?
```

**Manual test**:

```shell
curl -X POST http://localhost:3000/api/migrations/blog
```

**Expected**: Should return 401/403 or require authentication

**🚨 CRITICAL FINDING IF**: Route executes without authentication (this is a known P0)

---

### **Phase 1 Deliverable: Generate Phase 1 Report**

**Model recommendation**: Sonnet 3.5 or Opus 4.5 (for comprehensive synthesis)

**Cursor Prompt** (use Composer):

```
Generate a comprehensive Phase 1 Security Report using all the test results from security-tests/reports/.

Requirements:
1. Read all JSON reports from:
   - route-analysis.csv
   - public-routes-test.json
   - jwt-manipulation.json
   - workspace-isolation.json
   - rbac-test.json
   - sql-analysis.json
   - sql-injection-test.json
2. Synthesize into a structured markdown report with sections:
   - Executive Summary (total findings by severity)
   - Attack Surface Map (summary of route categories)
   - Authentication Bypass Findings
   - RBAC Escalation Findings
   - SQL Injection Findings
   - Cross-Workspace Isolation Findings
3. For each finding, include:
   - Severity: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL
   - Description
   - Reproduction steps (exact curl commands)
   - Impact
   - Recommended fix
   - Evidence (code snippets, response excerpts)
4. Include summary statistics and a prioritized remediation list
5. Format for professional delivery to Tony

Save to: security-tests/reports/PHASE_1_SECURITY_REPORT.md

Use tables, code blocks, and clear hierarchical structure.
```

**Review checklist before sending**:

* \[ \] All CRITICAL findings have complete reproduction steps  
* \[ \] Severity classifications are justified  
* \[ \] Known issues (like /api/migrations/blog) are documented  
* \[ \] Statistics match your test artifacts  
* \[ \] Recommendations are specific and actionable

---

## **Part 3: Phase 2 Workflows (Weeks 3-4)**

**Goal**: XSS, CSRF, workspace isolation deep dive  
 **Dependencies**: Tony implements wiki templates, @mentions, file attachments, real-time collab  
 **Deliverable**: Phase 2 Security Report

### **Phase 2, Task 5: XSS Testing**

#### **Step 5.1: XSS Payload Library Generator**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create a comprehensive XSS payload testing library for Loopwell.

Requirements:
1. Generate a JSON file with categorized XSS payloads:
   - Basic script injection: <script>alert('XSS')</script>
   - Event handlers: <img src=x onerror="alert(1)">
   - SVG-based: <svg onload="alert(1)">
   - Encoded variants: &#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;
   - Markdown/TipTap specific: [Click](javascript:alert(1)), ![](x onerror=alert(1))
   - DOM-based: <iframe srcdoc="<script>alert(1)</script>">
   - Polyglot: '><script>alert(1)</script>
2. For each payload, include:
   - Category
   - Description
   - Target context (HTML, attribute, JavaScript, Markdown)
   - Evasion technique used
3. Create a testing harness that:
   - Accepts an endpoint and field name
   - Systematically tests each payload
   - Detects if script executed (via response analysis)
   - Saves screenshots if running in headless browser mode (optional)

Save to: security-tests/phase2/xss-payloads.json and xss-tester.js
```

---

#### **Step 5.2: Wiki Editor XSS Test Suite**

**Model recommendation**: Sonnet 3.5 (TipTap-specific knowledge)

**Cursor Prompt**:

```
Create a TipTap editor XSS testing suite specifically for Loopwell's wiki.

Requirements:
1. Test XSS vectors through the wiki editor's POST /api/wiki/pages endpoint
2. Focus on:
   - Rich text content (HTML injection in editor output)
   - Page titles
   - @mentions (when implemented)
   - Embedded content (Figma, Loom URLs)
   - File attachment names
3. For each attack surface:
   - Submit payloads via API
   - Verify if payload is stored in database
   - Verify if payload executes when page is rendered
   - Check if DOMPurify or sanitization is applied
4. Test both:
   - Direct API submission (bypass editor)
   - Through browser automation (via editor UI) if possible
5. Output findings with:
   - Attack surface
   - Payload used
   - Stored in DB? (yes/no)
   - Executed on render? (yes/no)
   - Sanitization present? (yes/no)
   - Severity

Save to: security-tests/phase2/wiki-xss-tester.js

Include a --browser-test flag for UI-based testing (requires Playwright/Puppeteer).
```

**Run it**:

```shell
node security-tests/phase2/wiki-xss-tester.js \
  --session-token "YOUR_TOKEN" \
  > security-tests/reports/wiki-xss-test.json
```

**🚨 CRITICAL FINDING IF**: Any script payload executes when viewing a wiki page

---

#### **Step 5.3: Task Comments & AI Draft XSS Analysis**

**Model recommendation**: Cursor Chat \+ Composer (hybrid approach)

**Step A \- Chat for code review**:

```
Analyze these two files for XSS vulnerabilities:
1. src/components/tasks/task-comments.tsx
2. src/components/assistant/draft-editor.tsx

Both use dangerouslySetInnerHTML. For each:
- Show me the exact code where HTML is rendered
- Identify what sanitization (if any) is applied before rendering
- Explain what user input feeds into the HTML
- Assess the XSS risk (CRITICAL if no sanitization)
```

**Step B \- Composer for test generator**:

```
Based on the code analysis above, create XSS test scripts for:
1. Task comments (POST /api/tasks/[id]/comments)
2. AI draft output (test via Loopbrain chat)

For each:
- Test script injection in content
- Test if sanitization can be bypassed
- Output findings with evidence

Save to: security-tests/phase2/comments-xss-tester.js and draft-xss-tester.js
```

---

### **Phase 2, Task 6: CSRF Testing**

#### **Step 6.1: Cookie Security Analyzer**

**Model recommendation**: Cursor Chat (quick check)

**Cursor Prompt**:

```
Help me verify CSRF protection for Loopwell.

1. Explain how NextAuth.js sessions are stored (cookie vs. database)
2. Show me how to check cookie flags in the browser
3. What cookie flags should be set for CSRF protection?
4. Create a test script that checks if cookies have:
   - HttpOnly flag
   - Secure flag (in production)
   - SameSite=Lax or Strict
5. Provide a curl command to test cross-origin requests
```

---

#### **Step 6.2: CSRF Attack Simulation**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create a CSRF attack simulation toolkit.

Requirements:
1. Generate a malicious HTML page that attempts to:
   - Create a wiki page via POST /api/wiki/pages
   - Delete a project via DELETE /api/projects/[id]
   - Invite a user via POST /api/org/invitations/create
2. Each attack should use:
   - Hidden form with auto-submit
   - fetch() with credentials: 'include'
3. Create a local test server that serves the malicious page
4. Instructions for testing:
   - Open http://localhost:3000 and log in
   - Open http://localhost:8080/csrf-test.html (malicious page)
   - Check if attacks succeed
5. Document expected vs. actual behavior

Save to: security-tests/phase2/csrf-attack-page.html and csrf-test-server.js

The test server should run on port 8080 to be a different origin.
```

**Run it**:

```shell
# In one terminal: run Loopwell
npm run dev

# In another terminal: run CSRF test server
node security-tests/phase2/csrf-test-server.js

# Then open http://localhost:8080/csrf-test.html while logged into Loopwell
```

**Expected**: All cross-origin state-changing requests should be blocked by SameSite cookies

**🚨 HIGH FINDING IF**: Any state-changing operation succeeds from different origin

---

### **Phase 2, Task 7: WebSocket Security**

**Dependency**: Aleksei implements Socket.io by Week 3-4

**Model recommendation**: Sonnet 3.5 (WebSocket protocol knowledge)

**Cursor Prompt**:

```
Create a WebSocket security testing suite for Loopwell's real-time collaboration.

Requirements:
1. Connect to the Socket.io endpoint (likely /api/socketio or ws://localhost:3000)
2. Test authentication:
   - Can you connect without a valid session token?
   - What happens if token is expired?
   - Can you subscribe to channels without authorization?
3. Test workspace isolation:
   - Connect as Workspace A user
   - Attempt to join/listen to Workspace B channels
   - Send messages to Workspace B channels
4. Test message injection:
   - Send malformed messages
   - Send messages with script payloads
   - Send extremely large messages
5. Test rate limiting:
   - Send rapid-fire messages
   - Check if there's a rate limit
6. Output findings with:
   - Test name
   - Expected behavior
   - Actual behavior
   - Severity if mismatch

Save to: security-tests/phase2/websocket-tester.js

Use 'socket.io-client' package for connections.
```

**Setup**:

```shell
npm install socket.io-client
```

**Run it**:

```shell
node security-tests/phase2/websocket-tester.js \
  --workspace-a-token "TOKEN_A" \
  --workspace-b-token "TOKEN_B" \
  > security-tests/reports/websocket-test.json
```

---

### **Phase 2, Task 8: Workspace Isolation Deep Dive**

#### **Step 8.1: Comprehensive Model Isolation Tester**

**Model recommendation**: Opus 4.5 (complex test orchestration, thorough reasoning)

**Prerequisites**: Two populated test workspaces with data in all models

**Cursor Prompt**:

```
Create the most comprehensive workspace isolation testing suite possible.

Requirements:
1. Test isolation for EVERY critical model from the architecture context:
   - WikiPage, Project, Task, Todo
   - OrgDepartment, OrgTeam, Person (OrgPosition)
   - OrgInvitation, Goal, PerformanceReview, ChatSession
   - LeaveRequest, PersonAvailability, DecisionDomain, CapacityContract
2. For each model:
   a) Create a test record in Workspace A (via API)
   b) Capture the record ID
   c) Attempt to access that ID from Workspace B
   d) Test both GET (read) and PUT/DELETE (modify)
   e) Test list endpoints (should not show Workspace A records)
3. Use the WORKSPACE_SCOPED_MODELS array as reference (should be 122 models)
4. For each test, record:
   - Model name
   - API endpoint
   - Workspace A record ID
   - Workspace B access result (200/403/404/500)
   - Severity: CRITICAL if 200, PASS if 403/404
   - Evidence (response body excerpt)
5. Generate a detailed matrix showing pass/fail for each model
6. Highlight any CRITICAL findings at the top
7. Summary statistics: X/Y models properly isolated

Save to: security-tests/phase2/isolation-comprehensive-tester.js

This is a thorough, production-grade test. Expect it to run for several minutes.
```

**Run it**:

```shell
# This will take a while - run with verbose logging
node security-tests/phase2/isolation-comprehensive-tester.js \
  --workspace-a-token "TOKEN_A" \
  --workspace-b-token "TOKEN_B" \
  --verbose \
  > security-tests/reports/isolation-comprehensive.json 2>&1
```

**Expected**: 100% of tested models should return 403 or 404 for cross-workspace access

**🚨 CRITICAL FINDING IF**: ANY model returns 200 with data from another workspace

---

#### **Step 8.2: Isolation Report Generator**

**Model recommendation**: Sonnet 3.5

**Cursor Prompt**:

```
Generate a workspace isolation test matrix report from isolation-comprehensive.json.

Requirements:
1. Read the comprehensive test results
2. Create a markdown table with:
   - Model name
   - API endpoint tested
   - Result (PASS/CRITICAL)
   - Details
3. Group by severity (CRITICAL findings first)
4. Include summary: X models tested, Y passed, Z failed
5. For each CRITICAL finding, provide full reproduction steps
6. Compare against WORKSPACE_SCOPED_MODELS (122 models) and flag untested models

Save to: security-tests/reports/isolation-matrix-report.md
```

---

### **Phase 2 Deliverable: Generate Phase 2 Report**

**Model recommendation**: Opus 4.5 (comprehensive synthesis)

**Cursor Prompt**:

```
Generate the Phase 2 Security Report synthesizing all XSS, CSRF, WebSocket, and isolation findings.

Requirements:
1. Read all Phase 2 test results from security-tests/reports/
2. Structure the report with:
   - Executive Summary
   - XSS Findings (by attack surface)
   - CSRF Assessment
   - WebSocket Security Findings (if available)
   - Workspace Isolation Deep Dive
     - Full model-by-model matrix
     - Critical failures highlighted
     - Gap analysis (untested models)
3. For each finding:
   - Severity classification
   - Full reproduction steps
   - Impact analysis
   - Recommended fix with code examples
4. Prioritized remediation roadmap
5. Comparison to Phase 1: new findings vs. ongoing issues

Save to: security-tests/reports/PHASE_2_SECURITY_REPORT.md

Professional format suitable for delivery to Tony.
```

---

## **Part 4: Phase 3 Workflows (Weeks 5-6)**

**Goal**: API abuse, integrations, infrastructure security  
 **Dependencies**: Tony implements daily briefing, meeting prep; Aleksei implements Gmail/Calendar/Slack  
 **Deliverable**: Phase 3 Security Report

### **Phase 3, Task 9: API Abuse Testing**

#### **Step 9.1: Rate Limiting Checker**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create a comprehensive rate limiting and API abuse testing suite.

Requirements:
1. Test endpoints for rate limiting:
   - POST /api/auth/signin (authentication endpoint)
   - POST /api/wiki/pages (content creation)
   - POST /api/loopbrain/chat (AI queries)
   - POST /api/org/invitations/create (invitation spam)
2. For each endpoint:
   - Send 100 rapid requests
   - Measure response times
   - Check for 429 (Too Many Requests) responses
   - Check if rate limit is per-IP, per-user, or per-workspace
   - Measure how long rate limit lasts
3. Test large payload handling:
   - Send 1MB JSON payload
   - Send 10MB JSON payload
   - Send 100MB JSON payload
   - Check for 413 (Payload Too Large) or server crash
4. Test concurrent request races:
   - Create same resource 20 times concurrently
   - Check for duplicate creation
   - Check for database deadlocks (500 errors)
5. Output detailed results with recommendations

Save to: security-tests/phase3/api-abuse-tester.js

Include --dry-run and --aggressive modes (aggressive sends 1000 requests).
```

**Run it**:

```shell
# Dry run first
node security-tests/phase3/api-abuse-tester.js --dry-run

# Then actual test
node security-tests/phase3/api-abuse-tester.js \
  --session-token "YOUR_TOKEN" \
  > security-tests/reports/api-abuse-test.json
```

**Expected**: Server should have rate limiting on critical endpoints

**🚨 HIGH FINDING IF**: No rate limiting detected on authentication or resource creation endpoints

---

#### **Step 9.2: ID Enumeration Tester**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create an ID enumeration testing script.

Requirements:
1. Test if resource IDs are guessable or enumerable
2. For endpoints like /api/org/people/[id], /api/projects/[id], /api/wiki/pages/[id]:
   - Try sequential UUIDs (if patterns detected)
   - Try incrementing integers (if used anywhere)
   - Try common UUID prefixes
3. Track:
   - How many IDs return 200 (found)
   - How many return 404 (not found)
   - How many return 403 (forbidden)
   - Response time differences (timing attack detection)
4. Check if 404 vs 403 reveals existence:
   - Does 404 mean "doesn't exist" and 403 mean "exists but unauthorized"?
   - This is an information disclosure vector
5. Output findings with severity:
   - MEDIUM if 404/403 inconsistency reveals existence
   - LOW if UUIDs are properly random and unpredictable

Save to: security-tests/phase3/id-enumeration-tester.js
```

---

### **Phase 3, Task 10: Integration Security**

#### **Step 10.1: Slack Webhook Security Verifier**

**Model recommendation**: Sonnet 3.5

**Cursor Prompt**:

```
Create a Slack webhook security verification suite.

Context: The Slack webhook at /api/integrations/slack/webhook was recently fixed to use HMAC-SHA256 signature verification. Independently verify the fix.

Requirements:
1. Generate valid and invalid Slack webhook payloads
2. Test:
   a) Payload with correct signature → should accept (200)
   b) Payload with incorrect signature → should reject (401)
   c) Payload with modified body but original signature → should reject
   d) Replay attack: same payload sent twice, 6 minutes apart → second should reject (timestamp check)
   e) No X-Slack-Signature header → should reject
   f) Malformed signature header → should reject
3. Verify HMAC implementation:
   - Show the signature generation algorithm
   - Test against known test vectors from Slack documentation
4. Test NLP handler and Q&A processor (currently placeholders):
   - Send webhook with message
   - Verify it doesn't execute arbitrary code
   - Check for injection vectors

Save to: security-tests/phase3/slack-webhook-verifier.js

Use crypto module for signature verification testing.
```

**Run it**:

```shell
node security-tests/phase3/slack-webhook-verifier.js > security-tests/reports/slack-webhook-test.json
```

**🚨 CRITICAL FINDING IF**: Signature verification can be bypassed

---

#### **Step 10.2: OAuth Flow Security Checker**

**Dependency**: Aleksei implements Google Calendar/Gmail OAuth (Week 5-6)

**Model recommendation**: Sonnet 3.5

**Cursor Prompt**:

```
Create an OAuth flow security testing suite for Google Calendar and Gmail integrations.

Requirements:
1. Test OAuth state parameter validation:
   - Initiate OAuth flow and capture state parameter
   - Attempt to complete flow with different state value
   - Should reject (CSRF protection)
2. Test token storage:
   - Complete OAuth flow
   - Check if tokens are encrypted in database
   - Check if tokens appear in client-side JavaScript
   - Check if refresh tokens are stored securely
3. Test scope minimization:
   - List requested OAuth scopes
   - Verify only necessary scopes are requested (read-only where possible)
   - Flag any write scopes that aren't needed
4. Test token lifecycle:
   - Verify old tokens are invalidated after refresh
   - Test token expiry handling
   - Test revocation handling
5. Output findings with security recommendations

Save to: security-tests/phase3/oauth-security-tester.js

This may require manual steps (browser OAuth flow). Document them clearly.
```

---

#### **Step 10.3: Notion Import Security Tester**

**Dependency**: Tony implements Notion import (Week 3-4)

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create a Notion import security testing suite.

Requirements:
1. Generate malicious Notion export files:
   - Pages with XSS payloads in titles/content
   - Pages with SQL injection in content
   - Extremely large exports (10,000 pages)
   - Deeply nested page hierarchies (100 levels)
   - Files with executable extensions renamed to .png
   - ZIP bombs
2. Test each malicious export:
   - Upload via Notion import endpoint
   - Check if XSS payloads execute after import
   - Check if server handles large imports gracefully (no OOM crash)
   - Check if file types are validated
   - Check if import quotas/limits exist
3. Verify sanitization:
   - Do imported pages go through the same sanitization as manually created pages?
   - Check TipTap schema enforcement
4. Output findings with severity

Save to: security-tests/phase3/notion-import-tester.js and malicious-exports/ directory

Include sample malicious export files for testing.
```

---

### **Phase 3, Task 11: Infrastructure Security**

#### **Step 11.1: Dependency Vulnerability Scanner**

**Model recommendation**: Cursor Chat (quick check)

**Cursor Prompt**:

```
Help me run a comprehensive dependency security audit.

1. Run npm audit and analyze the output
2. Run npm audit --production to separate dev vs. production issues
3. For each Critical and High CVE:
   - Explain what it is
   - Determine if it affects Loopwell (runtime vs. dev-only)
   - Check if a fix is available
   - Recommend action (upgrade, patch, accept risk)
4. Generate a report of findings

Save output to: security-tests/reports/dependency-audit.txt
```

**Run it manually**:

```shell
npm audit --json > security-tests/reports/dependency-audit.json
npm audit --production --json > security-tests/reports/dependency-audit-prod.json
```

Then use Cursor to analyze the JSON files.

---

#### **Step 11.2: Environment Variable Leak Detector**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create a script to detect environment variable leakage.

Requirements:
1. Verify .env.local is in .gitignore (parse .gitignore)
2. Search all source files for hardcoded secrets:
   - Search for patterns: "sk-", "pk_", "AIza", common API key prefixes
   - Flag any hardcoded keys
3. Test if secrets leak in error messages:
   - Trigger errors on various endpoints
   - Check responses for DATABASE_URL, NEXTAUTH_SECRET, OPENAI_API_KEY
4. Check client-side bundles:
   - Run npm run build
   - Search .next/static/ for environment variable names
   - Search for secret values
5. Verify production configuration:
   - Test /api/e2e-auth returns 403 when NODE_ENV=production
   - Test /api/dev-login is unreachable in production
   - Test all /api/dev/* and /api/debug/* routes blocked

Save to: security-tests/phase3/env-leak-detector.js

Output findings with severity (CRITICAL if secrets exposed).
```

---

#### **Step 11.3: Error Message Information Leakage Tester**

**Model recommendation**: Composer 1.5

**Cursor Prompt**:

```
Create an error message information leakage testing suite.

Requirements:
1. Trigger various error conditions across endpoints:
   - Send malformed JSON
   - Send wrong data types (string instead of number)
   - Send missing required fields
   - Send invalid UUIDs
   - Cause database constraint violations
   - Cause authentication failures
2. For each error response, check for information leakage:
   - Stack traces (file paths, line numbers)
   - Database schema details (table names, column names)
   - SQL queries
   - Internal error codes that reveal architecture
   - User existence disclosure (different messages for "user not found" vs "wrong password")
3. Test in both development and production modes
4. Output findings:
   - Endpoint
   - Error triggered
   - Sensitive info leaked
   - Severity (HIGH if stack traces in prod, LOW if only in dev)

Save to: security-tests/phase3/error-leakage-tester.js

Test both development and production environments.
```

---

### **Phase 3 Deliverable: Generate Phase 3 Report**

**Model recommendation**: Sonnet 3.5

**Cursor Prompt**:

```
Generate the Phase 3 Security Report from all API abuse, integration, and infrastructure tests.

Requirements:
1. Read all Phase 3 reports from security-tests/reports/
2. Structure with sections:
   - Executive Summary
   - API Abuse & Rate Limiting Findings
   - Integration Security (Slack, OAuth, Notion)
   - Infrastructure & Configuration
   - Dependency Vulnerabilities
   - Environment Security
3. For each finding: severity, reproduction, impact, fix
4. Prioritized remediation list
5. Progress summary: Phase 1-3 findings overview

Save to: security-tests/reports/PHASE_3_SECURITY_REPORT.md
```

---

## **Part 5: Phase 4 Workflows (Weeks 7-10)**

**Goal**: Fix verification, new feature testing, final penetration test  
 **Deliverable**: Final Security Audit Report \+ Fix Verification Report

### **Phase 4: Fix Verification Process**

**Model recommendation**: Use the same models as original tests

For each finding from Phases 1-3:

1. **Tony/Aleksei notify you of a fix** (via Slack or git commit)  
2. **Pull latest code**: `git pull origin main`  
3. **Re-run the exact test** that found the vulnerability  
4. **Document the result**:  
   * ✅ VERIFIED FIXED \- vulnerability no longer present  
   * ❌ NOT FIXED \- vulnerability still exploitable  
   * ⚠️ PARTIALLY FIXED \- some mitigation but not complete  
   * 🔄 NEW ISSUE \- fix introduced a different problem

**Cursor Prompt** (use Chat for each fix):

```
Help me verify fix for [FINDING_ID from Phase X report].

1. Show me the git diff for the fix commit
2. Explain what changed
3. Help me re-run the original test
4. Analyze if the fix is complete or has gaps
5. Update the finding status in the report
```

### **Phase 4: New Feature Security Review**

As new features ship (Weeks 7-10), test them immediately:

| Feature | Security Test Focus |
| ----- | ----- |
| Daily briefing (Loopbrain) | Workspace isolation, data leakage between users |
| Meeting prep (Loopbrain) | Calendar data scoping, prompt injection via meeting titles |
| Slack notify (outbound) | Webhook URL validation, notification misdirection |
| Email digest (Resend) | Recipient list validation, email injection |
| Embedded content (Figma/Loom) | URL validation, iframe sandboxing, script injection |
| Project duplication | Permission copying, RBAC enforcement |

**Cursor Prompt template** (adapt for each feature):

```
Create a security test suite for [NEW_FEATURE].

Context: [Describe the feature from roadmap]

Requirements:
1. Identify attack surfaces
2. Test authentication and authorization
3. Test workspace isolation if applicable
4. Test input validation and injection vectors
5. Test for data leakage
6. Output findings

Save to: security-tests/phase4/[feature]-security-test.js
```

---

### **Phase 4: Final Penetration Test (Week 10\)**

**Prerequisites**: Production environment is deployed

**Model recommendation**: Opus 4.5 (comprehensive final assessment)

#### **Step 4.1: Production Security Headers Check**

**Cursor Prompt** (Chat):

```
Help me verify security headers on the production Loopwell deployment.

1. Generate curl commands to check for:
   - Strict-Transport-Security (HSTS)
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - X-XSS-Protection
   - Referrer-Policy
2. Explain what each header does and what value it should have
3. Run nmap SSL/TLS scan to check cipher suites
4. Create a checklist of expected vs. actual headers

Save to: security-tests/phase4/production-headers-check.sh
```

---

#### **Step 4.2: Full Production Regression Test**

**Cursor Prompt** (Composer):

```
Create a comprehensive production regression test that re-runs all critical tests from Phases 1-3 against the production environment.

Requirements:
1. Combine the most critical tests:
   - Auth bypass testing (subset of Phase 1 Task 2)
   - RBAC escalation (subset of Phase 1 Task 3)
   - Workspace isolation (subset of Phase 2 Task 8)
   - XSS (subset of Phase 2 Task 5)
   - API abuse (subset of Phase 3 Task 9)
2. Accept --base-url parameter for production URL
3. Skip destructive tests (don't actually try to delete production data)
4. Output a pass/fail summary
5. Flag any regressions (tests that passed in dev but fail in prod)

Save to: security-tests/phase4/production-regression.js

Include safety checks: require --i-accept-risk flag to run against production.
```

**Run it**:

```shell
node security-tests/phase4/production-regression.js \
  --base-url https://app.loopwell.com \
  --session-token "PROD_TOKEN" \
  --i-accept-risk \
  > security-tests/reports/production-regression.json
```

---

### **Phase 4 Final Deliverable: Complete Security Audit Report**

**Model recommendation**: Opus 4.5 (executive-level synthesis)

**Cursor Prompt** (Composer):

```
Generate the final comprehensive Security Audit Report for Loopwell.

Requirements:
1. Synthesize all findings from Phases 1-4
2. Structure:
   - Executive Summary
     - Total findings by severity
     - Overall risk assessment (Safe to launch / Launch with caveats / Do not launch)
     - Critical findings summary
     - Remediation status summary
   - Methodology
     - Tools used
     - Testing dates and environments
     - Scope (what was tested, what was excluded)
   - Detailed Findings
     - All findings with: ID, Severity, Category, Description, Reproduction, Impact, Recommendation, Status, Fix Verification
     - Group by severity then category
   - Workspace Isolation Matrix (full table)
   - Dependency Audit Results
   - Fix Verification Report
     - Each fix tested with pass/fail status
   - Recommendations
     - Prioritized remediation list for remaining issues
     - Ongoing security practices
     - Future security considerations
3. Professional formatting suitable for investor/stakeholder review
4. Include metrics: X total tests run, Y findings, Z critical, A fixed, B remaining

Save to: security-tests/reports/FINAL_SECURITY_AUDIT_REPORT.md

Also generate an executive summary PDF: security-tests/reports/EXECUTIVE_SUMMARY.pdf
```

---

## **Part 6: Reusable Patterns & Reference**

### **Pattern: Finding Severity Classification**

Use this table to classify findings:

| Severity | Criteria | Examples |
| ----- | ----- | ----- |
| **CRITICAL** | Unauthenticated access to user data, cross-workspace data leakage, RCE | Workspace A can read Workspace B's data, SQL injection that executes, XSS that steals session tokens |
| **HIGH** | Authentication bypass, privilege escalation, data exposure | VIEWER can perform ADMIN actions, secrets in error messages, CSRF on state-changing operations |
| **MEDIUM** | Information disclosure, denial of service, incomplete validation | 404 vs 403 reveals record existence, no rate limiting, timing attacks possible |
| **LOW** | Minor information leakage, missing security headers (non-critical) | Stack traces in development mode, verbose error messages that don't leak secrets |
| **INFORMATIONAL** | Best practices, hardening recommendations | Missing CSP header (no exploit demonstrated), unused dependencies with CVEs |

---

### **Pattern: Report Format Specification**

Every finding should follow this JSON structure:

```json
{
  "id": "LOOP-SEC-001",
  "severity": "CRITICAL",
  "category": "Workspace Isolation",
  "title": "Cross-workspace data access via /api/wiki/pages/:id",
  "description": "A user in Workspace A can access wiki pages from Workspace B by directly requesting the page ID.",
  "reproduction": [
    "1. Log in as user in Workspace A",
    "2. Obtain a wiki page ID from Workspace B (e.g., via database or social engineering)",
    "3. GET /api/wiki/pages/<workspace-b-page-id> with Workspace A session token",
    "4. Response returns 200 with full page content from Workspace B"
  ],
  "impact": "Complete breakdown of tenant isolation. Any user can read any other workspace's confidential documentation.",
  "recommendation": "Verify that WikiPage model is in WORKSPACE_SCOPED_MODELS array. Add explicit workspace check in the route handler as defense-in-depth.",
  "evidence": {
    "request": "GET /api/wiki/pages/abc-123",
    "response": "200 OK, {title: 'Confidential Strategy', workspaceId: 'workspace-b'}",
    "code": "src/app/api/wiki/pages/[id]/route.ts line 45"
  },
  "status": "VERIFIED_FIXED",
  "fixCommit": "a1b2c3d",
  "fixVerificationDate": "2026-03-15",
  "fixVerificationNotes": "Re-tested after fix. Now returns 404 for cross-workspace access."
}
```

---

### **Pattern: Automated Test Template**

Every test script should follow this structure:

```javascript
#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  sessionToken: process.env.SESSION_TOKEN || '',
  verbose: process.argv.includes('--verbose'),
  dryRun: process.argv.includes('--dry-run')
};

// Results accumulator
const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  critical: 0,
  findings: []
};

// Test helper
async function runTest(name, testFn) {
  results.totalTests++;
  console.log(`Running: ${name}`);
  
  try {
    const result = await testFn();
    if (result.passed) {
      results.passed++;
      console.log(`✓ PASS: ${name}`);
    } else {
      results.failed++;
      if (result.severity === 'CRITICAL') results.critical++;
      results.findings.push({ name, ...result });
      console.log(`✗ FAIL: ${name} [${result.severity}]`);
    }
  } catch (error) {
    results.failed++;
    results.findings.push({ 
      name, 
      passed: false, 
      severity: 'ERROR', 
      error: error.message 
    });
    console.log(`✗ ERROR: ${name} - ${error.message}`);
  }
}

// Main test suite
async function main() {
  console.log('Starting security tests...\n');
  
  // Add your tests here
  await runTest('Test 1', async () => {
    // Test implementation
    return { passed: true };
  });
  
  // Output results
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${results.totalTests} | Passed: ${results.passed} | Failed: ${results.failed} | Critical: ${results.critical}`);
  console.log('='.repeat(50));
  
  // Write JSON report
  const reportPath = path.join(__dirname, '../reports', 'test-results.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
  
  process.exit(results.critical > 0 ? 1 : 0);
}

main().catch(console.error);
```

---

### **Pattern: Using Cursor Effectively**

**When to use Cursor Chat:**

* Quick code review ("Is this function vulnerable to XSS?")  
* Understanding existing code ("Explain how this auth flow works")  
* Debugging test failures ("Why is this test failing?")  
* Quick checks ("Are these cookies configured correctly?")

**When to use Cursor Composer:**

* Generating complete test scripts  
* Creating test infrastructure  
* Writing comprehensive reports  
* Refactoring test suites  
* Bulk file operations

**Multi-turn Workflow Example:**

1. **Chat**: "Analyze src/lib/unified-auth.ts and explain how workspace context is derived"  
2. **Chat**: "Are there any edge cases where workspaceId could be null?"  
3. **Composer**: "Based on the analysis above, create a test script that exploits null workspaceId scenarios"  
4. **Run test**  
5. **Chat**: "The test found X. Is this a vulnerability or expected behavior?"  
6. **Composer**: "Generate a finding report for this issue"

---

### **Quick Reference: Model Selection Guide**

| Task Type | Use This Model | Why |
| ----- | ----- | ----- |
| Generating test scripts | Composer 1.5 | Fast, cost-effective, good at code generation |
| Complex security analysis | Sonnet 3.5 | Better reasoning about attack vectors |
| Comprehensive reports | Opus 4.5 | Best at synthesis, executive-level writing |
| Quick code review | Chat with Sonnet 3.5 | Fast interactive analysis |
| Understanding architecture | Chat with Sonnet 3.5 | Good at explaining complex systems |
| Test debugging | Chat with Composer 1.5 | Quick iterations |

---

### **Common Cursor Prompts**

**Code Review:**

```
Review this file for security vulnerabilities: [file path]
Focus on: authentication bypass, input validation, injection, data leakage
```

**Test Generation:**

```
Create a test script for [specific vulnerability type] in [component/endpoint].
Include: test cases, expected results, severity classification
Save to: [path]
```

**Report Generation:**

```
Analyze [test results file] and generate a findings report.
Format: [format specification]
Include: severity, reproduction, impact, recommendation
```

**Fix Verification:**

```
I found [vulnerability] in [location].
The fix was committed in [commit hash].
Help me verify the fix is complete by:
1. Analyzing the code changes
2. Creating a regression test
3. Confirming the vulnerability is resolved
```

---

## **Part 7: Communication & Workflow**

### **Reporting Critical Findings**

**If you discover:**

* Unauthenticated access to user data  
* Cross-workspace data leakage  
* SQL injection that executes  
* Remote code execution

**Immediately:**

1. Stop testing that area  
2. Document the finding with full reproduction steps  
3. Message Tony on Slack with: "CRITICAL SECURITY FINDING \- \[brief description\]"  
4. Do NOT include full exploit details in Slack (use secure channel)  
5. Provide detailed writeup in a private document

### **Regular Communication**

**Daily:**

* Brief status update in Slack (what you tested, high-level results)  
* Example: "Phase 1 Day 3: Completed RBAC testing. No critical findings. 2 medium findings documented."

**Weekly:**

* Detailed progress report with statistics  
* Highlight any blockers or questions

**Phase Completion:**

* Deliver formal phase report (markdown document)  
* Summary presentation (10-15 min) to Tony/Aleksei

### **Using This Guide with Cursor**

**Recommended Workflow:**

1. **Add this file to Cursor workspace**: `File → Add Folder to Workspace` (select security-tests directory)  
2. **Reference it in prompts**: "Following the Phase 1, Task 1 workflow in SECURITY\_TESTING\_GUIDE.md, create the route analysis script"  
3. **Cursor will automatically read it** and use it as context  
4. **Copy specific prompts** from this guide when needed  
5. **Customize prompts** based on what you discover

**Example:**

```
[Open Cursor Composer]

"Using the 'Attack Surface Mapping' workflow from SECURITY_TESTING_GUIDE.md,
create the route analysis script. Make sure it checks for all three auth
patterns: getUnifiedAuth, assertAccess, and setWorkspaceContext."
```

Cursor will:

* Read the guide  
* Find the workflow section  
* Generate the script according to specifications

---

## **Part 8: Testing Infrastructure Setup**

### **One-Time Setup**

Run this once to set up your testing environment:

```shell
# Create branch
git checkout -b security/testing-phase1

# Create directory structure
mkdir -p security-tests/{phase1,phase2,phase3,phase4,reports,scripts}

# Initialize package.json for test dependencies
cd security-tests
npm init -y
npm install jsonwebtoken socket.io-client axios

# Create .gitignore for test artifacts
cat > .gitignore << 'EOF'
node_modules/
*.log
reports/*.json
reports/*.csv
!reports/.gitkeep
.env
EOF

# Create reports directory placeholder
touch reports/.gitkeep

# Add SECURITY_TESTING_GUIDE.md to workspace
cd ..
cp /path/to/SECURITY_TESTING_GUIDE.md security-tests/

# Commit infrastructure
git add security-tests/
git commit -m "security: Initialize testing infrastructure"
```

### **Before Each Phase**

```shell
# Update from main
git checkout main
git pull origin main
git checkout security/testing-phase1
git merge main

# Install any new dependencies
npm install

# Start dev server for testing
npm run dev
```

### **After Each Phase**

```shell
# Review all test artifacts
ls -la security-tests/reports/

# Commit phase results
git add security-tests/
git commit -m "security: Phase [N] testing complete - [summary]"
git push origin security/testing-phase1

# Generate phase report
node security-tests/phase[N]/generate-report.js
```

---

## **Appendix: Loopwell Codebase Quick Reference**

### **Key Files to Know**

| File | Purpose |
| ----- | ----- |
| `src/lib/unified-auth.ts` | Auth entry point \- read this first |
| `src/lib/auth/assertAccess.ts` | RBAC enforcement |
| `src/lib/prisma/scopingMiddleware.ts` | Workspace isolation (122 models) |
| `src/lib/api-errors.ts` | Error handling patterns |
| `src/lib/validations/` | Zod schemas for input validation |
| `CLAUDE.md` | Codebase documentation (in repo root) |
| `CODEBASE_AUDIT_2026-02-24.md` | Detailed audit report |
| `CURRENT_STATE_AUDIT_2026-02-24.md` | Known issues tracker |

### **Where to Find Things**

* **API routes**: `src/app/api/`  
* **Components**: `src/components/`  
* **Database schema**: `prisma/schema.prisma`  
* **Tests**: `src/__tests__/`  
* **Loopbrain**: `src/lib/loopbrain/`

### **Helpful Commands**

```shell
# Find all routes
find src/app/api -name 'route.ts' | wc -l

# Search for specific pattern
grep -r "getUnifiedAuth" src/app/api/

# Count files
find src -name '*.ts' -o -name '*.tsx' | wc -l

# Run existing tests
npm run test
npm run test:e2e

# Check TypeScript
npm run typecheck

# Lint
npm run lint
```

---

## **Questions?**

If you get stuck or need clarification:

1. **Architecture questions**: Ask Tony  
2. **Backend/database questions**: Ask Tony or Aleksei  
3. **Feature behavior**: Ask Tony  
4. **Git/deployment**: Ask Tony  
5. **Cursor help**: Use Cursor Chat with this guide

**Remember**: The goal is to prove Loopwell is safe, not to break it. Every test that passes is as valuable as every vulnerability you find.

---

**End of Guide**

You're ready to start. Begin with Phase 1, Task 1\. Good luck, and thank you for making Loopwell secure\! 🔒

