# Org Module Enforcement System

This document describes the enforcement system for Org module engineering ground rules.

---

## Overview

The enforcement system consists of:

1. **Documentation** - Authoritative rules and guidelines
2. **Scan Script** - Automated pattern detection
3. **Prompt Template** - Required structure for Cursor prompts
4. **Canonical Helpers** - Standardized implementation patterns

---

## Documentation Files

### Core Rules
- `docs/ORG_ENGINEERING_GROUND_RULES.md` - Authoritative engineering rules (non-negotiable)
- `docs/ORG_PHASE_PLAN.md` - Phase-by-phase progression plan
- `docs/ORG_CURSOR_PROMPT_TEMPLATE.md` - Required prompt structure
- `docs/ORG_UI_RULES.md` - UI development guidelines

### Implementation
- `src/server/org/README.md` - Server module structure and rules
- `src/server/org/auth.ts` - Canonical auth helper

---

## Scan Script

**Location**: `scripts/org-scan.js`  
**Command**: `npm run org:scan`

### What It Checks

The scan script detects forbidden patterns:

1. **orgId identifier** - Flags usage of `orgId` (must use `workspaceId`)
2. **requireActiveOrgId** - Flags deprecated function (must use `requireOrgContext`)
3. **Deprecated models** - Flags `Org`, `OrgMembership`, legacy `SavedView`
4. **Server Actions** - Flags `"use server"` in Org paths (must use Route Handlers)

### Exclusions

The script excludes:
- `schema.prisma` - Has orgId fields that need Phase 1 migration
- `prisma/seed/**` - Legacy seed data
- Documentation files (`.md`) - They explain what NOT to do
- The scan script itself - It references these patterns

### Expected Behavior

**Current Status**: The scan will fail until Phase 1 cleanup is complete.

This is expected and documented. The violations found are the work items for Phase 1:
- Replace `orgId` with `workspaceId`
- Replace `requireActiveOrgId` with `requireOrgContext`
- Remove references to deprecated models
- Convert Server Actions to Route Handlers

---

## Usage

### Pre-merge Check

Run the scan before merging Org-related changes:

```bash
npm run org:scan
```

If it fails, fix the violations or ensure they're part of planned Phase 1 work.

### During Development

Use the scan to catch violations early:

```bash
# After making changes
npm run org:scan
```

### CI/CD Integration

The scan should be integrated into CI/CD pipelines as a pre-merge check for Org-related PRs.

---

## Canonical Patterns

### Auth Pattern

All Org API routes must use:

```typescript
import { requireOrgContext } from "@/server/org/auth";

export async function GET(request: NextRequest) {
  const { userId, workspaceId } = await requireOrgContext(
    request,
    "org:read" // or "org:write"
  );
  
  // Prisma queries are now automatically scoped to workspaceId
  // ...
}
```

### Route Handler Structure

```typescript
// ✅ GOOD: Route Handler
// src/app/api/org/example/route.ts
export async function GET(request: NextRequest) {
  // ...
}

// ❌ BAD: Server Action
// "use server"
export async function exampleAction() {
  // ...
}
```

---

## Prompt Template

Every Org-related Cursor prompt must follow the structure in `docs/ORG_CURSOR_PROMPT_TEMPLATE.md`.

Required sections:
1. Pre-flight checklist
2. Plan explanation
3. File paths
4. Regression checks
5. Migration instructions
6. Verification steps

---

## Phase 1 Cleanup Tasks

The scan currently flags these as violations (to be fixed in Phase 1):

1. Replace all `orgId` parameters with `workspaceId`
2. Replace `requireActiveOrgId()` with `requireOrgContext()` or equivalent
3. Remove type aliases equating `OrgId = WorkspaceId`
4. Convert Server Actions to Route Handlers
5. Update references from deprecated models to current models

---

## Success Criteria

The enforcement system is successful when:

1. ✅ Documentation is clear and authoritative
2. ✅ Scan script catches violations accurately
3. ✅ Developers use canonical helpers
4. ✅ Prompts follow required template
5. ✅ Phase 1 cleanup completes (scan passes)

---

**Last Updated**: Enforcement system established  
**Status**: Active (scan will fail until Phase 1 complete - this is expected)

