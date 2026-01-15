# Org Module Enforcement System - Setup Summary

This document summarizes the enforcement system setup completed for the Org module.

---

## Files Created

### Documentation
1. **`docs/ORG_ENGINEERING_GROUND_RULES.md`**
   - Authoritative engineering rules (non-negotiable)
   - 10 core rules governing all Org work
   - Supersedes Phase 0 documentation and historical assumptions

2. **`docs/ORG_CURSOR_PROMPT_TEMPLATE.md`**
   - Required structure for all Org-related Cursor prompts
   - Pre-flight checklist
   - Standard patterns and forbidden patterns reference

3. **`docs/ORG_PHASE_PLAN.md`**
   - Phase-by-phase progression plan
   - Current: Phase 1 (Schema Truth + ID Cleanup)
   - Success criteria for each phase

4. **`docs/ORG_UI_RULES.md`**
   - UI development guidelines
   - Mandatory use of existing components
   - Forbidden patterns (custom UI kits, duplicate primitives)

5. **`docs/ORG_ENFORCEMENT_SYSTEM.md`**
   - Overview of enforcement system
   - Scan script documentation
   - Usage instructions

### Implementation
6. **`src/server/org/auth.ts`**
   - Canonical auth helper: `requireOrgContext()`
   - Enforces required pattern: `getUnifiedAuth` → `assertAccess` → `setWorkspaceContext`
   - Returns `{ userId, workspaceId }` for use in routes

7. **`src/server/org/README.md`**
   - Server module structure and rules
   - Code organization guidelines
   - Example usage patterns

### Scripts
8. **`scripts/org-scan.js`**
   - Automated pattern detection script
   - Checks for forbidden patterns:
     - `orgId` usage (must use `workspaceId`)
     - `requireActiveOrgId` (must use `requireOrgContext`)
     - Deprecated models (`Org`, `OrgMembership`, legacy `SavedView`)
     - Server Actions in Org paths (must use Route Handlers)
   - Excludes: schema.prisma, seed files, documentation

9. **`package.json`** (updated)
   - Added script: `"org:scan": "node scripts/org-scan.js"`

---

## Key Rules Established

### 1. Canonical Identity
- `workspaceId` is the ONLY canonical identifier
- `orgId` does not exist as a semantic concept
- Type aliases equating `OrgId = WorkspaceId` are forbidden

### 2. Auth Pattern (Strict)
Every Org backend entry point MUST follow:
1. `getUnifiedAuth(request)`
2. `assertAccess({ userId, workspaceId, scope, role })`
3. `setWorkspaceContext(workspaceId)`
4. Prisma queries (scoped automatically)

### 3. Backend Pattern Lock
- Next.js Route Handlers only
- No Server Actions
- No direct Prisma access from UI

### 4. Database Truth Policy
- Missing tables are NOT acceptable
- Defensive fallback code is NOT allowed long-term
- Feature flags control rollout, not mask broken schema

### 5. Deprecated Models
Do NOT use:
- `Org` model
- `OrgMembership` model
- legacy `SavedView` model

### 6. Loopbrain Integration
Every Org mutation MUST:
- Produce a `ContextObject`
- Persist it
- Trigger indexing (non-blocking)

---

## Usage

### Running the Scan

```bash
npm run org:scan
```

**Expected Result**: Scan will fail until Phase 1 cleanup is complete. This is expected and documented.

### Using the Auth Helper

```typescript
import { requireOrgContext } from "@/server/org/auth";

export async function GET(request: NextRequest) {
  const { userId, workspaceId } = await requireOrgContext(
    request,
    "org:read" // or "org:write"
  );
  
  // Prisma queries are automatically scoped to workspaceId
  // ...
}
```

### Prompt Template

Every Org-related Cursor prompt must include:
1. Pre-flight checklist
2. Plan explanation
3. File paths
4. Regression checks
5. Migration instructions
6. Verification steps

See `docs/ORG_CURSOR_PROMPT_TEMPLATE.md` for the full template.

---

## Current Status

### ✅ Completed
- All documentation created
- Enforcement system established
- Scan script operational
- Canonical auth helper created
- Package.json updated

### 📋 Phase 1 Work Items (Scan Currently Flags)
- Replace `orgId` with `workspaceId` throughout codebase
- Replace `requireActiveOrgId()` with `requireOrgContext()`
- Remove type aliases equating `OrgId = WorkspaceId`
- Convert Server Actions to Route Handlers
- Update deprecated model references

---

## Next Steps

1. **Phase 1 Cleanup** - Address violations flagged by scan
2. **Verify** - Run `npm run org:scan` after cleanup (should pass)
3. **Document** - Update Phase 1 status in `ORG_PHASE_PLAN.md`
4. **Proceed** - Move to Phase 2 when Phase 1 criteria met

---

**Setup Date**: Enforcement system established  
**Status**: Active and operational  
**Authority**: All rules supersede previous documentation

