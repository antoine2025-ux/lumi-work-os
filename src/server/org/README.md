# Org Server Module Rules

This directory contains shared server-side logic for the Org module.

---

## Structure

- **Route handlers**: Live in `src/app/api/org/**/route.ts`
- **Shared logic**: Lives in `src/server/org/**`
- **Auth helpers**: Use `src/server/org/auth.ts` for canonical auth pattern

---

## Rules

### ✅ Mandatory

1. **No direct Prisma usage from UI**
   - All database access must go through API routes
   - UI components call `/api/org/**` endpoints

2. **All mutations must emit Loopbrain ContextObject**
   - Every Org mutation (create, update, delete) must:
     - Produce a `ContextObject`
     - Persist it via context store
     - Trigger indexing (non-blocking)

3. **Do not use deprecated models**
   - ❌ `Org` model
   - ❌ `OrgMembership` model
   - ❌ Legacy `SavedView` model
   - ✅ Use `Workspace`, `WorkspaceMember`, `OrgSavedView` instead

4. **Use canonical auth pattern**
   - Import `requireOrgContext` from `@/server/org/auth`
   - Or manually follow: `getUnifiedAuth` → `assertAccess` → `setWorkspaceContext`

5. **Use `workspaceId` only**
   - Never accept `orgId` parameters
   - Never use type aliases equating `OrgId = WorkspaceId`

---

## Code Organization

```
src/server/org/
├── auth.ts              # Canonical auth helper
├── health/              # Health computation logic
├── people/              # People-related logic
├── structure/           # Structure (departments, teams, positions)
└── ...                  # Other domain logic
```

---

## Example Usage

```typescript
// src/server/org/example-service.ts
import { prisma } from "@/lib/db";
import type { WorkspaceId } from "@/lib/org/types";

/**
 * Example service function
 * Note: workspaceId is the ONLY identifier
 */
export async function getExampleData(workspaceId: WorkspaceId) {
  // Prisma queries automatically scoped if setWorkspaceContext was called
  return await prisma.orgDepartment.findMany({
    where: { workspaceId, isActive: true }
  });
}
```

```typescript
// src/app/api/org/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/auth";
import { getExampleData } from "@/server/org/example-service";

export async function GET(request: NextRequest) {
  // Canonical auth pattern
  const { workspaceId } = await requireOrgContext(request, "org:read");
  
  // Call service with workspaceId
  const data = await getExampleData(workspaceId);
  
  return NextResponse.json({ data });
}
```

---

## See Also

- [Engineering Ground Rules](../../../docs/ORG_ENGINEERING_GROUND_RULES.md)
- [Cursor Prompt Template](../../../docs/ORG_CURSOR_PROMPT_TEMPLATE.md)
- [Phase Plan](../../../docs/ORG_PHASE_PLAN.md)

