# Org Cursor Prompt Template (Must Use)

This template ensures all Org development follows the Engineering Ground Rules.

---

## Required Pre-Flight Checklist (Fail the prompt if any item is false)

- [ ] All scopes are `workspaceId` only (no `orgId`, no aliases, no compatibility wrappers)
- [ ] Backend entrypoints follow: `getUnifiedAuth(request)` → `assertAccess(...)` → `setWorkspaceContext(workspaceId)` → Prisma
- [ ] Implementation uses Next.js Route Handlers only (no Server Actions)
- [ ] UI never touches Prisma directly; UI calls API routes
- [ ] No defensive fallback for missing tables; schema must exist before enabling feature
- [ ] Feature flags used only to gate rollout, never to mask schema issues or return fake data
- [ ] Deprecated models not referenced: `Org`, `OrgMembership`, legacy `SavedView`
- [ ] Every Org mutation writes Loopbrain `ContextObject` + triggers indexing (non-blocking)
- [ ] UI uses `src/components/ui/*` and existing layout patterns
- [ ] Work is Phase-aligned (Phase 1 now: schema truth + ID cleanup)

---

## Prompt Output Requirements

Every Org prompt **must** include:

1. **Plan explanation before code** - What will change and why
2. **Explicit file paths for every change** - No ambiguity
3. **Regression checks** - How to verify existing functionality isn't broken
4. **Migration instructions** - Prisma migrate/generate when applicable
5. **Verification steps** - Manual + minimal automated suggestions

---

## Standard Auth/Scoping Pattern (Reference)

All Org API route handlers **must** follow this pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
// Or use the canonical helper:
import { requireOrgContext } from "@/server/org/auth";

export async function GET(request: NextRequest) {
  // Pattern 1: Using the canonical helper (preferred)
  const { userId, workspaceId } = await requireOrgContext(
    request,
    "org:read" // or "org:write"
  );
  
  // Pattern 2: Manual steps (if helper doesn't fit)
  // const auth = await getUnifiedAuth(request);
  // const userId = auth.user.userId;
  // const workspaceId = auth.workspaceId;
  // await assertAccess({ userId, workspaceId, scope: "org:read" });
  // await setWorkspaceContext(workspaceId);
  
  // Now Prisma queries are automatically scoped
  const data = await prisma.orgDepartment.findMany({
    where: { workspaceId, isActive: true }
  });
  
  return NextResponse.json({ data });
}
```

---

## "Forbidden Patterns" Quick Scan

Before submitting code, verify none of these exist:

- ❌ Any parameter named `orgId`
- ❌ Any function named `requireActiveOrgId`
- ❌ Accepting `workspaceId` from body/params/query
- ❌ Missing `assertAccess`
- ❌ Server Actions for Org (`"use server"` in Org paths)
- ❌ UI querying Prisma directly
- ❌ Returning fake data for missing tables
- ❌ Defensive try/catch masking schema issues
- ❌ References to deprecated models (`Org`, `OrgMembership`, legacy `SavedView`)
- ❌ Mutations without Loopbrain context creation

---

## Example Prompt Structure

```
# Task: [Brief description]

## Plan
[Explain what will change, why, and how it aligns with ground rules]

## Files to Modify
- `src/app/api/org/[specific]/route.ts` - [What change]
- `src/server/org/[specific].ts` - [What change]

## Files to Create
- `src/server/org/[new].ts` - [What it does]

## Regression Checks
- [ ] Existing route `/api/org/X` still works
- [ ] Auth still enforced
- [ ] No console errors

## Migration Instructions
```bash
npx prisma migrate dev --name [name]
npx prisma generate
```

## Verification Steps
1. Run `npm run org:scan` (should pass)
2. Test route manually: [specific test]
3. Verify Loopbrain context created: [how to check]
```

---

**Usage**: Copy this structure into every Org-related Cursor prompt.

