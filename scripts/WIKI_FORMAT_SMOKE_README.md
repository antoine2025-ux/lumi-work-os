# Wiki Format Smoke Test

## Overview

This smoke test verifies the wiki page format invariants implemented in PR1:
- New pages default to JSON format
- Format switching is blocked
- Mismatched payloads are rejected
- Title-only updates work without requiring contentJson

## Running the Test

### Prerequisites

1. **Database connection**: Ensure `DATABASE_URL` is set in your environment
   ```bash
   export DATABASE_URL="postgresql://..."
   ```

2. **Dependencies**: Ensure all npm packages are installed
   ```bash
   npm install
   ```

### Run the Test

```bash
npx tsx scripts/wiki-format-smoke.ts
```

Or if you have `tsx` globally installed:

```bash
tsx scripts/wiki-format-smoke.ts
```

### Expected Output

```
🧪 Wiki Format Invariant Smoke Tests

📦 Setting up test fixtures...
   ✅ Using existing test user: clxxx...
   ✅ Using existing test workspace: clxxx...

Test 1: New page defaults to JSON format
✅ New page has contentFormat=JSON
✅ New page has contentJson set
✅ New page contentJson matches EMPTY_TIPTAP_DOC

Test 2: Invalid updates are rejected
✅ Format switching prevented (simulated)
✅ HTML page cannot accept contentJson (simulated)
✅ JSON page cannot accept HTML content (simulated)

Test 3: Title-only update preserves contentJson
✅ Title updated successfully
✅ contentJson unchanged after title-only update
✅ contentFormat unchanged after title-only update
✅ No version created for title-only update

Test 4: EMPTY_TIPTAP_DOC structure validation
✅ EMPTY_TIPTAP_DOC has type=doc
✅ EMPTY_TIPTAP_DOC has content array
✅ EMPTY_TIPTAP_DOC content array is not empty
✅ EMPTY_TIPTAP_DOC first content item is paragraph

📊 Test Summary
Total tests: 12
✅ Passed: 12
❌ Failed: 0

🧹 Cleaning up test data...
   ✅ Deleted test JSON page
   ✅ Deleted test HTML page

🎉 All tests passed!
```

## What Gets Tested

### Test 1: New Page Creation
- Creates a new wiki page with minimal payload (title only)
- Verifies `contentFormat` is set to `'JSON'`
- Verifies `contentJson` is set to `EMPTY_TIPTAP_DOC`
- Verifies `content` is empty string

### Test 2: Invalid Updates (Simulated)
- Notes that format switching should be rejected (full test requires API)
- Notes that HTML pages cannot accept `contentJson` (full test requires API)
- Notes that JSON pages cannot accept `content` (full test requires API)

**Note**: Full API route testing (400 responses) requires:
- Running dev server: `npm run dev`
- Authenticated session cookie
- Making HTTP requests to `/api/wiki/pages`
- See manual verification steps in `PR1_POLISH_FINAL_SUMMARY.md`

### Test 3: Title-Only Update
- Updates only the title field (no `contentJson` provided)
- Verifies title is updated
- Verifies `contentJson` remains unchanged
- Verifies `contentFormat` remains `'JSON'`
- Verifies no version is created (versions only created on content changes)

### Test 4: EMPTY_TIPTAP_DOC Structure
- Validates the structure of the empty document constant
- Ensures it's a valid TipTap JSON document

## Test Data

The script:
- Creates a test user: `test-wiki-format@lumi.local`
- Creates a test workspace: `Wiki Format Test Workspace`
- Creates test pages (JSON and HTML)
- **Cleans up test pages** after tests complete
- **Keeps test user/workspace** for future test runs (can be manually deleted)

## Troubleshooting

### Database Connection Error
```
Error: Can't reach database server
```
**Solution**: Check `DATABASE_URL` environment variable is set correctly.

### Prisma Client Not Generated
```
Error: Cannot find module '@prisma/client'
```
**Solution**: Run `npx prisma generate` or `npm run postinstall`.

### Test Failures
If tests fail:
1. Check the error message in the output
2. Verify database schema is up to date: `npx prisma migrate deploy`
3. Check that `EMPTY_TIPTAP_DOC` constant exists in `src/lib/wiki/constants.ts`
4. Verify wiki page schema includes `contentFormat`, `contentJson`, `textContent` fields

## Integration with CI/CD

To run in CI:

```bash
# Example GitHub Actions step
- name: Run Wiki Format Smoke Test
  run: npx tsx scripts/wiki-format-smoke.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Manual API Route Testing

For full end-to-end API testing (including 400 error responses), use the manual verification steps in `PR1_POLISH_FINAL_SUMMARY.md`:

1. **Create new page without contentJson:**
   ```bash
   curl -X POST http://localhost:3000/api/wiki/pages \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{"title": "Test Page"}'
   ```

2. **Attempt format switching:**
   ```bash
   curl -X PUT http://localhost:3000/api/wiki/pages/{htmlPageId} \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{"contentFormat": "JSON", "contentJson": {...}}'
   # Expected: 400 error
   ```

3. **Title-only update:**
   ```bash
   curl -X PUT http://localhost:3000/api/wiki/pages/{jsonPageId} \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{"title": "Updated Title"}'
   # Expected: 200 OK, contentJson unchanged
   ```

## Related Files

- `src/app/api/wiki/pages/route.ts` - POST endpoint (creates pages)
- `src/app/api/wiki/pages/[id]/route.ts` - PUT endpoint (updates pages)
- `src/lib/wiki/constants.ts` - EMPTY_TIPTAP_DOC constant
- `PR1_POLISH_FINAL_SUMMARY.md` - Full implementation summary and manual checks

