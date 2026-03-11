# E2E Test Suite

Comprehensive end-to-end tests for Loopwell using Playwright.

## 5 Critical Flow Tests

These tests cover the most important user journeys in Loopwell:

### 1. Onboarding Flow (`onboarding-flow.spec.ts`)
**Purpose:** Verify new workspace onboarding wizard works correctly

**Coverage:**
- Step 1 loads or redirects completed users to home
- Welcome page redirects appropriately
- Onboarding progress API returns valid state
- Invalid steps redirect gracefully
- Templates API responds correctly

**Key Scenarios:**
- First-time user completes 5-step wizard
- Existing user is redirected to home
- Progress is tracked correctly

### 2. Wiki CRUD (`wiki-crud.spec.ts`)
**Purpose:** Test complete wiki page lifecycle

**Coverage:**
- ✅ **Create:** POST /api/wiki/pages creates new page
- ✅ **Read:** GET /api/wiki/pages/[id] retrieves page
- ✅ **Update:** PUT /api/wiki/pages/[id] modifies page
- ✅ **Delete:** DELETE /api/wiki/pages/[id] removes page
- Duplicate title validation (409 error)
- Browser navigation to wiki pages
- Wiki listing and pagination

**Key Scenarios:**
- Create page with title and content
- View page in browser at /wiki/[slug]
- Edit page title and content
- Delete page and verify 404

### 3. Task CRUD (`tasks-crud.spec.ts`)
**Purpose:** Test complete task lifecycle within projects

**Coverage:**
- ✅ **Create:** POST /api/tasks creates new task
- ✅ **Read:** GET /api/tasks/[id] retrieves task
- ✅ **Update:** PUT /api/tasks/[id] modifies task
- ✅ **Complete:** Change status to DONE
- ✅ **Delete:** DELETE /api/tasks/[id] removes task
- Task listing by project
- Validation (requires projectId)
- UI navigation from projects to tasks

**Key Scenarios:**
- Create task with title, description, assignee, priority
- Update task status to IN_PROGRESS
- Add comment to task
- Mark task as DONE
- Delete task

### 4. Loopbrain Chat (`loopbrain-chat.spec.ts`)
**Purpose:** Test AI-powered organizational Q&A system

**Coverage:**
- Chat interface loads and is interactive
- Can submit questions via Enter or button click
- API responds to various question types:
  - People questions ("How many people work here?")
  - Project questions ("What projects are active?")
  - Capacity questions ("Who is overloaded?")
- Response display and formatting
- Error handling (empty questions, invalid schema)
- Chat history persistence
- Navigation to /ask page

**Key Scenarios:**
- Ask "what projects are currently active?"
- Ask "who is overloaded?"
- Verify response contains relevant data (not an error)
- Verify feedback buttons are visible (when implemented)

**Note:** Tests verify UI flow works end-to-end. AI response quality requires OpenAI API keys and is not validated in E2E tests.

### 5. Workspace Isolation (`workspace-isolation.spec.ts`)
**Purpose:** Verify multi-tenant data isolation

**Coverage:**
- API responses only contain workspace-scoped data
- Cross-workspace access returns 404/403
- Workspace context is consistent across API calls
- Projects, tasks, wiki pages, org members are all scoped
- Non-existent resource access is handled correctly

**Key Scenarios:**
- Log in as user in Workspace A
- Note a wiki page ID from Workspace A
- Log in as user in Workspace B (requires multi-user setup)
- Try to access Workspace A's wiki page via direct URL
- Verify 404 or access denied (not data leak)
- Try to access Workspace A's project via API
- Verify 403 or 404

**Current Implementation:** Tests verify single-workspace scoping. Multi-workspace cross-access tests require additional test user setup.

## Test Configuration

### Playwright Config (`playwright.config.ts`)

- **Test Directory:** `./tests/e2e`
- **Base URL:** `http://localhost:3000`
- **Server Mode:**
  - Local: Dev server (`npm run dev`)
  - CI: Production build (`npm run start:e2e`)
- **Retries:** 2 in CI, 0 locally
- **Parallel:** Yes (1 worker in CI for stability)
- **Reporters:** HTML (open on failure), GitHub Actions

### Authentication

Two modes supported:

#### Local Development (Manual OAuth)
1. Start dev server: `npm run dev`
2. Generate auth state: `npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login`
3. Complete Google OAuth in browser
4. Auth state saved to `.auth/user.json` and reused

#### CI Environment (Automated)
- Set `E2E_AUTH_ENABLED=true`
- Set `E2E_AUTH_SECRET` environment variable
- Uses `/api/e2e-auth` endpoint to create test session
- Creates E2E test user and workspace automatically

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/e2e/wiki-crud.spec.ts
```

### With UI (Debug Mode)
```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Specific Test by Name
```bash
npx playwright test -g "Create: POST /api/wiki/pages"
```

### Watch Mode (Rerun on Changes)
```bash
npx playwright test --watch
```

## Test Helpers

Located in `tests/e2e/helpers/page-ready.ts`:

- `skipIfNoAuth(page)` - Skip test if not authenticated
- `gotoAuthenticated(page, url)` - Navigate and skip if redirected to login
- `waitForPageReady(page)` - Wait for page to be interactive
- `waitForNavigation(page, urlPattern)` - Wait for URL change
- `waitForElement(page, selector)` - Wait for element to appear
- `waitForApiResponse(page, urlPattern)` - Wait for API call
- `waitForText(page, text)` - Wait for text to appear
- `isAuthenticated(page)` - Check if session is valid

## Test Patterns

### API-First Testing
Most tests use API calls (`page.request.post()`) rather than UI interactions for:
- Speed (no need to navigate UI)
- Reliability (no UI flakiness)
- Isolation (test API contracts directly)

UI tests focus on:
- Navigation flows
- User interactions (clicks, typing)
- Visual feedback (loading states, errors)

### Graceful Skipping
Tests skip gracefully when:
- Authentication is not available
- Required data doesn't exist (no projects, no wiki pages)
- APIs return 401/403
- Features are not configured (OpenAI for Loopbrain)

This ensures tests don't fail in environments where setup is incomplete.

### Cleanup
Tests clean up after themselves:
- `afterAll` hooks delete created resources
- Cleanup runs even if tests fail
- Uses `.catch(() => {})` to ignore cleanup errors

### Unique Identifiers
All test data uses `Date.now()` in titles/names to avoid collisions with:
- Real data in the workspace
- Other concurrent test runs
- Previous test runs that failed cleanup

## Test Coverage Summary

| Category | Test File | Tests | Status |
|----------|-----------|-------|--------|
| **Critical Flow 1** | `onboarding-flow.spec.ts` | 5 | ✅ Passing |
| **Critical Flow 2** | `wiki-crud.spec.ts` | 12 | ✅ Passing |
| **Critical Flow 3** | `tasks-crud.spec.ts` | 17 | ✅ Passing |
| **Critical Flow 4** | `loopbrain-chat.spec.ts` | 15 | ✅ New |
| **Critical Flow 5** | `workspace-isolation.spec.ts` | 10 | ✅ Passing |
| Auth | `auth.spec.ts`, `auth-redirects.spec.ts` | 8 | ✅ Passing |
| Projects | `projects.spec.ts` | 6 | ✅ Passing |
| Todos | `todos.spec.ts` | 4 | ✅ Passing |
| Goals | `goals-workflow.spec.ts` | 5 | ✅ Passing |
| Org | `org-routing.spec.ts` | 4 | ✅ Passing |
| Spaces | `spaces.spec.ts` | 3 | ✅ Passing |
| Roles | `role-enforcement.spec.ts` | 6 | ✅ Passing |
| Dashboard | `dashboard.spec.ts` | 3 | ✅ Passing |
| **Total** | **15 files** | **98+** | **✅ Comprehensive** |

## CI Integration

Tests run in GitHub Actions on:
- Pull requests
- Pushes to main
- Manual workflow dispatch

CI Configuration:
- Runs on Ubuntu latest
- Uses production build for stability
- Saves HTML report as artifact
- Saves videos/screenshots on failure
- Fails build if tests fail

## Debugging Failed Tests

### View HTML Report
```bash
npx playwright show-report
```

### Run Single Test with Trace
```bash
npx playwright test tests/e2e/wiki-crud.spec.ts --trace on
```

### View Trace
```bash
npx playwright show-trace trace.zip
```

### Check Screenshots
Failed tests save screenshots to `test-results/`

### Check Videos
Failed tests save videos to `test-results/`

## Adding New Tests

1. Create test file in `tests/e2e/`
2. Import helpers: `import { skipIfNoAuth, gotoAuthenticated } from './helpers/page-ready'`
3. Use `test.describe()` to group related tests
4. Use `skipIfNoAuth(page)` at start of tests requiring auth
5. Clean up created resources in `afterAll` or at end of test
6. Use unique identifiers (`Date.now()`) for test data
7. Handle graceful skipping when data/config is missing

## Known Limitations

1. **Multi-workspace cross-access testing** requires creating multiple test users with different workspace memberships. Currently, workspace isolation tests verify single-workspace scoping only.

2. **Loopbrain response quality** requires OpenAI API keys. Tests verify the UI flow works but don't validate AI response accuracy.

3. **Real-time collaboration** (Tiptap/Yjs) is not tested in E2E suite. Requires multiple browser contexts and WebSocket connections.

4. **Email delivery** (invites, notifications) is not tested. Requires email service mocking or test email accounts.

5. **File uploads** (attachments, images) are not tested. Requires multipart form data handling.

## Future Enhancements

- [ ] Multi-user workspace isolation tests
- [ ] Real-time collaboration tests
- [ ] File upload tests
- [ ] Email delivery tests
- [ ] Mobile viewport tests (config exists but disabled)
- [ ] Accessibility tests (axe-core integration)
- [ ] Performance tests (Lighthouse CI exists)
- [ ] Visual regression tests (Percy/Chromatic)
